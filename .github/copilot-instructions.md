# Copilot Instructions for TradingAgents

## Project Overview
- **TradingAgents** is a modular, multi-agent LLM-powered financial trading research framework. It simulates a real-world trading firm with specialized agents (analysts, researchers, trader, risk management, portfolio manager) collaborating via a graph-based workflow.
- The core orchestration is in `tradingagents/graph/trading_graph.py` using LangGraph for agent coordination and propagation.
- Each agent type (analyst, researcher, trader, risk manager) is implemented as a class/module under `tradingagents/agents/` and subfolders.
- Data ingestion and online/offline tool access are handled via `tradingagents/dataflows/` utilities.
- The CLI (`cli/main.py`) provides an interactive, stepwise workflow for running analyses and visualizing agent progress.

## Key Patterns & Conventions
- **Configuration:** All runtime and LLM settings are managed via `tradingagents/default_config.py`. Copy and modify `DEFAULT_CONFIG` for custom runs.
- **Agent Roles:** Analyst, Researcher, Trader, Risk Management, and Portfolio Manager are distinct roles, each with their own memory and logic. See `trading_graph.py` for orchestration.
- **Data Flow:** Agents use both online (live API) and offline (cached) tools. Tool selection is controlled by config (`online_tools`).
- **State Logging:** Each run logs full agent state and decisions to `eval_results/{ticker}/TradingAgentsStrategy_logs/` as JSON.
- **CLI Workflow:** The CLI guides users through ticker/date/agent selection, then streams agent progress and results using `rich` panels. See `cli/main.py` for the full workflow.
- **Extensibility:** To add a new agent or tool, implement it in the appropriate submodule and register it in the graph setup.

## Developer Workflows
- **Run CLI:** `python -m cli.main` (interactive analysis)
- **Run Programmatically:** See README for example using `TradingAgentsGraph` and `.propagate()`
- **Config:** Edit `tradingagents/default_config.py` or pass a config dict to `TradingAgentsGraph`.
- **Dependencies:** Install with `pip install -r requirements.txt`. Requires API keys for FinnHub and OpenAI (set as env vars).
- **Testing:** No formal test suite; validate by running CLI or programmatic examples and inspecting logs/reports.

## Integration & External Dependencies
- **LLMs:** Supports OpenAI, Anthropic, Google (configurable via `llm_provider` and `backend_url`).
- **Data APIs:** FinnHub, yfinance, Reddit, Google News, SimFin, etc. (see `requirements.txt` and `dataflows/` utils).
- **Visualization:** Uses `rich` for CLI UI.

## Examples
- See `README.md` for usage and configuration examples.
- Example agent orchestration: `tradingagents/graph/trading_graph.py`
- Example CLI workflow: `cli/main.py`

---

**When contributing code or using AI agents:**
- Follow the modular agent pattern and register new agents/tools in the graph setup.
- Keep configuration centralized and override via config dicts, not hardcoded values.
- Ensure new data sources/tools are accessible via both online and offline modes if possible.
- Maintain clear separation between agent logic, dataflows, and orchestration.
- Document new agent roles, tools, or workflow changes in this file and the README.
