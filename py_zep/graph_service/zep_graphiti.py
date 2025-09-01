import logging
import os
from typing import Annotated

from fastapi import Depends, HTTPException
from graphiti_core import Graphiti  # type: ignore
from graphiti_core.edges import EntityEdge  # type: ignore
from graphiti_core.errors import EdgeNotFoundError, GroupsEdgesNotFoundError, NodeNotFoundError
from graphiti_core.llm_client import LLMClient  # type: ignore
from graphiti_core.nodes import EntityNode, EpisodicNode  # type: ignore
from openai import AsyncOpenAI
from graphiti_core.embedder.openai import OpenAIEmbedderConfig
from graph_service.config import ZepEnvDep
from graph_service.dto import FactResult

logger = logging.getLogger(__name__)
_DEBUG_EMBEDDER = os.getenv("ZEP_EMBEDDER_DEBUG", "false").lower() in {"1", "true", "yes"}
_LOG_RAW_HTTP = os.getenv("ZEP_EMBEDDER_LOG_RAW", "false").lower() in {"1", "true", "yes"}


class ZepGraphiti(Graphiti):
    def __init__(self, uri: str, user: str, password: str, llm_client: LLMClient | None = None):
        super().__init__(uri, user, password, llm_client)

    async def save_entity_node(self, name: str, uuid: str, group_id: str, summary: str = ''):
        logger.debug("Creating entity node", extra={
            "op": "save_entity_node",
            "name": name,
            "uuid": uuid,
            "group_id": group_id,
        })
        if _DEBUG_EMBEDDER:
            logger.debug("Embedder type", extra={"embedder_type": str(type(self.embedder))})
        
        # Debug embedder details if it's our OpenAI embedder
        if _DEBUG_EMBEDDER and hasattr(self.embedder, 'config'):
            logger.debug("Embedder config present", extra={})
        client_attr = getattr(self.embedder, 'client', None)
        if _DEBUG_EMBEDDER and client_attr is not None:
            # Avoid logging API keys
            logger.debug("Embedder client details", extra={
                "base_url": getattr(client_attr, 'base_url', None),
                "api_key_present": bool(getattr(client_attr, 'api_key', None)),
            })
        
        new_node = EntityNode(
            name=name,
            uuid=uuid,
            group_id=group_id,
            summary=summary,
        )
        
        logger.debug("Generating name embedding", extra={"op": "save_entity_node", "uuid": uuid})
        try:
            await new_node.generate_name_embedding(self.embedder)
            logger.debug("Name embedding generated", extra={"uuid": uuid})
        except Exception as e:
            logger.exception("Name embedding failed", extra={
                "uuid": uuid,
                "error": str(e),
                "error_type": str(type(e)),
            })
            raise
            
        logger.debug("Saving node", extra={"uuid": uuid})
        await new_node.save(self.driver)
        logger.debug("Node saved", extra={"uuid": uuid})
        return new_node

    async def get_entity_edge(self, uuid: str):
        try:
            edge = await EntityEdge.get_by_uuid(self.driver, uuid)
            return edge
        except EdgeNotFoundError as e:
            raise HTTPException(status_code=404, detail=e.message) from e

    async def delete_group(self, group_id: str):
        try:
            edges = await EntityEdge.get_by_group_ids(self.driver, [group_id])
        except GroupsEdgesNotFoundError:
            logger.warning(f'No edges found for group {group_id}')
            edges = []

        nodes = await EntityNode.get_by_group_ids(self.driver, [group_id])
        episodes = await EpisodicNode.get_by_group_ids(self.driver, [group_id])

        for edge in edges:
            await edge.delete(self.driver)

        for node in nodes:
            await node.delete(self.driver)

        for episode in episodes:
            await episode.delete(self.driver)

    async def delete_entity_edge(self, uuid: str):
        try:
            edge = await EntityEdge.get_by_uuid(self.driver, uuid)
            await edge.delete(self.driver)
        except EdgeNotFoundError as e:
            raise HTTPException(status_code=404, detail=e.message) from e

    async def delete_episodic_node(self, uuid: str):
        try:
            episode = await EpisodicNode.get_by_uuid(self.driver, uuid)
            await episode.delete(self.driver)
        except NodeNotFoundError as e:
            raise HTTPException(status_code=404, detail=e.message) from e


async def get_graphiti(settings: ZepEnvDep):
    client = ZepGraphiti(
        uri=settings.neo4j_uri,
        user=settings.neo4j_user,
        password=settings.neo4j_password,
    )
    
    # Configure LLM client
    if settings.openai_base_url is not None:
        client.llm_client.config.base_url = settings.openai_base_url
    if settings.openai_api_key is not None:
        client.llm_client.config.api_key = settings.openai_api_key
    if settings.model_name is not None:
        client.llm_client.model = settings.model_name

    # Configure embedder with proper OpenAIEmbedderConfig
    if settings.openai_base_url is not None and settings.openai_api_key is not None:
        logger.info("Configuring OpenAI embedder", extra={"base_url": settings.openai_base_url is not None})
        from graphiti_core.embedder.openai import OpenAIEmbedder

        # Normalize base_url: ensure it includes the /v1 path used by LM Studio
        base_url = settings.openai_base_url
        try:
            base_url = base_url.rstrip('/')
        except Exception:
            base_url = settings.openai_base_url
        if not base_url.endswith('/v1'):
            base_url = base_url + '/v1'

        # Prefer `OPEN_AI_KEY` env var for the embedder (special zep_graphiti support)
        api_key = os.getenv('OPEN_AI_KEY') or settings.openai_api_key

        # Create proper embedder configuration (use env-derived api_key)
        embedder_config = OpenAIEmbedderConfig(
            api_key=api_key,
            embedding_model=settings.embedding_model_name or "text-embedding-3-small",
            embedding_dim=2560,  # Dimensions for text-embedding-qwen3-embedding-4b used in debug
            base_url=base_url,
        )

        if _DEBUG_EMBEDDER:
            logger.debug("Created embedder config", extra={
                "embedding_model": embedder_config.embedding_model,
                "embedding_dim": embedder_config.embedding_dim,
                "base_url": embedder_config.base_url,
                "api_key_present": bool(api_key),
            })

        # Create AsyncOpenAI client with proper configuration
        async_openai_client = AsyncOpenAI(
            base_url=base_url,
            api_key=api_key,
        )

        if _DEBUG_EMBEDDER:
            logger.debug("Created AsyncOpenAI client")

        # Add a small wrapper around the embeddings.create method to log low-level
        # information if parsing fails at the OpenAI client layer.
        try:
            orig_create = async_openai_client.embeddings.create

            async def _create_wrapper(*args, **kwargs):
                if _DEBUG_EMBEDDER:
                    logger.debug("embeddings.create called", extra={
                        "args_len": len(args),
                        "kwargs_keys": list(kwargs.keys()),
                    })
                try:
                    result = await orig_create(*args, **kwargs)
                    if _DEBUG_EMBEDDER:
                        logger.debug("embeddings.create returned successfully")
                    # If pydantic parsed no data, fetch raw JSON to patch
                    if getattr(result, 'data', None) is None:
                        try:
                            import httpx
                            # reconstruct payload same as original call
                            payload = {}
                            if 'input' in kwargs:
                                payload['input'] = kwargs['input']
                            elif args:
                                payload['input'] = args[0]
                            payload['model'] = kwargs.get('model', getattr(embedder_config, 'embedding_model', None))
                            emb_url = base_url.rstrip('/') + '/embeddings'
                            headers = {'Content-Type': 'application/json'}
                            if api_key:
                                headers['Authorization'] = f'Bearer {api_key}'
                            async with httpx.AsyncClient(timeout=10.0) as httpc:
                                resp = await httpc.post(emb_url, json=payload, headers=headers)
                                if _LOG_RAW_HTTP:
                                    logger.debug('Raw HTTP embeddings request', extra={
                                        "url": emb_url,
                                        "payload_keys": list(payload.keys()),
                                        "status": resp.status_code,
                                    })
                                json_resp = await resp.json()
                                data_list = json_resp.get('data')
                                if data_list is None and 'embeddings' in json_resp:
                                    # LM Studio returns raw embeddings list under 'embeddings'
                                    patched = [ {'object':'embedding','embedding':e,'index':i} for i,e in enumerate(json_resp['embeddings']) ]
                                    setattr(result, 'data', patched)
                                if _DEBUG_EMBEDDER:
                                    logger.debug('Patched result.data from embeddings')
                                else:
                                    setattr(result, 'data', data_list)
                                if _DEBUG_EMBEDDER:
                                    logger.debug('Patched result.data from data field')
                        except Exception as patch_err:
                            if _DEBUG_EMBEDDER:
                                logger.debug('Failed to patch result.data via raw HTTP', extra={"error": repr(patch_err)})
                    return result
                except Exception as e:
                    logger.warning("embeddings.create raised exception", extra={"error": repr(e)})
                    # Attempt raw HTTP request to capture full response
                    try:
                        import httpx
                        payload = {}
                        if 'input' in kwargs:
                            payload['input'] = kwargs.get('input')
                        elif len(args) >= 1:
                            payload['input'] = args[0]
                        payload['model'] = kwargs.get('model', getattr(embedder_config, 'embedding_model', None))
                        emb_url = base_url.rstrip('/') + '/embeddings'
                        headers = {'Content-Type': 'application/json'}
                        if api_key:
                            headers['Authorization'] = f'Bearer {api_key}'
                        async with httpx.AsyncClient(timeout=10.0) as httpc:
                            resp = await httpc.post(emb_url, json=payload, headers=headers)
                            if _LOG_RAW_HTTP:
                                try:
                                    text = await resp.aread()
                                except Exception:
                                    text = resp.text
                                logger.debug('Raw embeddings response', extra={
                                    "url": emb_url,
                                    "status": resp.status_code,
                                    "body_len": len(text) if hasattr(text, "__len__") else None,
                                })
                    except Exception as raw_err:
                        if _DEBUG_EMBEDDER:
                            logger.debug('Failed raw HTTP debug request', extra={"error": repr(raw_err)})
                    raise

            async_openai_client.embeddings.create = _create_wrapper
        except Exception:
            if _DEBUG_EMBEDDER:
                logger.debug("Failed to wrap embeddings.create for extra logging")

        # Replace the embedder with properly configured one
        old_embedder = client.embedder
        client.embedder = OpenAIEmbedder(
            config=embedder_config,
            client=async_openai_client,
        )

        if _DEBUG_EMBEDDER:
            logger.debug("Replaced embedder", extra={
                "old": str(type(old_embedder)),
                "new": str(type(client.embedder)),
            })
    else:
        logger.info("Not replacing embedder - missing OpenAI settings")

    try:
        yield client
    finally:
        await client.close()


async def initialize_graphiti(settings: ZepEnvDep):
    client = ZepGraphiti(
        uri=settings.neo4j_uri,
        user=settings.neo4j_user,
        password=settings.neo4j_password,
    )
    await client.build_indices_and_constraints()


def get_fact_result_from_edge(edge: EntityEdge):
    # Ensure valid_at is not None; fallback to created_at if necessary
    return FactResult(
        uuid=edge.uuid,
        name=edge.name,
        fact=edge.fact,
        valid_at=edge.valid_at if edge.valid_at is not None else edge.created_at,
        invalid_at=edge.invalid_at,
        created_at=edge.created_at,
        expired_at=edge.expired_at,
    )


ZepGraphitiDep = Annotated[ZepGraphiti, Depends(get_graphiti)]