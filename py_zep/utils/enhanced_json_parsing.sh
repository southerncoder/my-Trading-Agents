#!/bin/sh
# Enhanced JSON parsing functions for start-wrapper.sh
# This script provides additional hardening for JSON parsing operations

# Enhanced JSON validation with comprehensive error handling
enhanced_do_get() {
  URL="$1"; API_KEY="$2"
  python - "$URL" "$API_KEY" <<'PY' > /tmp/lm_wrapper_http_out.txt 2>/tmp/lm_wrapper_http_err.txt
import sys, urllib.request, json, re, time

def validate_json_structure(data, expected_structure="auto"):
    """Validate JSON structure against expected patterns"""
    try:
        if expected_structure == "auto":
            # Auto-detect structure type
            if isinstance(data, dict):
                if 'data' in data and isinstance(data['data'], list):
                    return "openai_models"
                elif 'models' in data and isinstance(data['models'], list):
                    return "simple_models"
                elif 'error' in data:
                    return "error_response"
                else:
                    return "unknown_dict"
            elif isinstance(data, list):
                return "model_array"
            else:
                return "unexpected_type"
        
        return expected_structure
    except Exception:
        return "validation_error"

def sanitize_response_text(text):
    """Sanitize response text to handle encoding issues"""
    try:
        # Remove potential BOM and normalize line endings
        text = text.replace('\ufeff', '').replace('\r\n', '\n').replace('\r', '\n')
        
        # Remove trailing/leading whitespace
        text = text.strip()
        
        # Basic checks for obvious non-JSON content
        if not text:
            return None, "Empty response"
        
        # Check if it starts/ends with JSON brackets/braces
        if not (text.startswith(('{', '[')) and text.endswith(('}', ']'))):
            # Try to extract JSON from within the text
            json_match = re.search(r'(\{.*\}|\[.*\])', text, re.DOTALL)
            if json_match:
                text = json_match.group(1)
            else:
                return None, f"No JSON structure found in: {text[:100]}..."
        
        return text, None
    except Exception as e:
        return None, f"Sanitization error: {str(e)}"

url = sys.argv[1]
api_key = sys.argv[2]

# Enhanced request with better error handling
req = urllib.request.Request(url, method='GET')
if api_key and api_key.strip():
    req.add_header('Authorization', f'Bearer {api_key.strip()}')

# Add additional headers for better compatibility
req.add_header('Accept', 'application/json')
req.add_header('Content-Type', 'application/json')
req.add_header('User-Agent', 'Zep-Graphiti/1.0')

start_time = time.time()

try:
    with urllib.request.urlopen(req, timeout=15) as r:
        raw_body = r.read()
        code = r.getcode()
        response_time = time.time() - start_time
        
        # Handle different encoding possibilities
        encodings_to_try = ['utf-8', 'latin-1', 'ascii']
        body = None
        
        for encoding in encodings_to_try:
            try:
                body = raw_body.decode(encoding)
                break
            except UnicodeDecodeError:
                continue
        
        if body is None:
            body = raw_body.decode('utf-8', errors='replace')
            
        # Sanitize the response
        sanitized_body, sanitize_error = sanitize_response_text(body)
        if sanitize_error:
            raise ValueError(f"Response sanitization failed: {sanitize_error}")
        
        body = sanitized_body
        
        # Enhanced JSON validation with multiple attempts
        json_parse_attempts = 0
        parsed_data = None
        parse_errors = []
        
        while json_parse_attempts < 3 and parsed_data is None:
            json_parse_attempts += 1
            
            try:
                parsed_data = json.loads(body)
                
                # Validate structure
                structure_type = validate_json_structure(parsed_data)
                
                # Additional validation based on detected structure
                if structure_type == "error_response":
                    error_msg = parsed_data.get('error', {})
                    if isinstance(error_msg, dict):
                        error_text = error_msg.get('message', 'Unknown API error')
                    else:
                        error_text = str(error_msg)
                    raise ValueError(f"API returned error: {error_text}")
                
                elif structure_type == "unexpected_type":
                    raise ValueError(f"Unexpected JSON structure type: {type(parsed_data)}")
                
                # Write enhanced status information
                status_info = {
                    'status': 'VALID_JSON',
                    'structure_type': structure_type,
                    'response_time': response_time,
                    'parse_attempts': json_parse_attempts,
                    'size_bytes': len(body)
                }
                
                with open('/tmp/lm_json_status.txt', 'w') as f:
                    f.write(json.dumps(status_info))
                
                break
                
            except json.JSONDecodeError as json_err:
                parse_errors.append(f"Attempt {json_parse_attempts}: {str(json_err)}")
                
                # Try to fix common JSON issues
                if json_parse_attempts == 1:
                    # Remove trailing commas
                    body = re.sub(r',(\s*[}\]])', r'\1', body)
                elif json_parse_attempts == 2:
                    # Try to handle truncated JSON
                    if body.count('{') > body.count('}'):
                        body += '}' * (body.count('{') - body.count('}'))
                    elif body.count('[') > body.count(']'):
                        body += ']' * (body.count('[') - body.count(']'))
            
            except ValueError as val_err:
                parse_errors.append(f"Validation error: {str(val_err)}")
                break
        
        if parsed_data is None:
            # All parsing attempts failed
            error_summary = "; ".join(parse_errors)
            body = f"JSON_PARSE_ERROR: {error_summary}"
            code = 0
            
            with open('/tmp/lm_json_status.txt', 'w') as f:
                f.write(json.dumps({
                    'status': 'INVALID_JSON',
                    'errors': parse_errors,
                    'response_time': response_time,
                    'original_length': len(body)
                }))

except Exception as e:
    response_time = time.time() - start_time
    error_type = type(e).__name__
    
    # Categorize the error
    if "timeout" in str(e).lower():
        error_category = "TIMEOUT_ERROR"
    elif "connection" in str(e).lower():
        error_category = "CONNECTION_ERROR"  
    elif "404" in str(e) or "not found" in str(e).lower():
        error_category = "NOT_FOUND_ERROR"
    elif "401" in str(e) or "unauthorized" in str(e).lower():
        error_category = "AUTH_ERROR"
    elif "500" in str(e) or "internal server" in str(e).lower():
        error_category = "SERVER_ERROR"
    else:
        error_category = "NETWORK_ERROR"
    
    body = f"{error_category}: {str(e)}"
    code = 0
    
    with open('/tmp/lm_json_status.txt', 'w') as f:
        f.write(json.dumps({
            'status': error_category,
            'error': str(e),
            'error_type': error_type,
            'response_time': response_time
        }))

# Write the final response
with open('/tmp/lm_list_resp.txt', 'w') as f:
    f.write(body)

print(code)
PY
  cat /tmp/lm_wrapper_http_out.txt 2>/dev/null || true
}

# Enhanced model detection with fuzzy matching and better error handling
enhanced_check_model_in_response() {
  local model_name="$1"
  local response_file="$2"
  
  # Check JSON validation status with enhanced error reporting
  if [ -f /tmp/lm_json_status.txt ]; then
    json_status_content=$(cat /tmp/lm_json_status.txt 2>/dev/null || echo '{"status":"UNKNOWN"}')
  else
    json_status_content='{"status":"NO_STATUS_FILE"}'
  fi
  
  # Use Python for enhanced model detection
  python - "$model_name" "$response_file" "$json_status_content" <<'PY' 2>/dev/null || return 1
import sys, json, re
from difflib import SequenceMatcher

def similarity(a, b):
    """Calculate similarity between two strings"""
    return SequenceMatcher(None, a.lower(), b.lower()).ratio()

def fuzzy_match_model(target_model, available_models, threshold=0.85):
    """Find fuzzy matches for model names"""
    exact_matches = []
    fuzzy_matches = []
    
    for model in available_models:
        if model == target_model:
            exact_matches.append(model)
        elif target_model.lower() in model.lower() or model.lower() in target_model.lower():
            fuzzy_matches.append((model, 1.0))
        else:
            sim = similarity(target_model, model)
            if sim >= threshold:
                fuzzy_matches.append((model, sim))
    
    return exact_matches, sorted(fuzzy_matches, key=lambda x: x[1], reverse=True)

model_name = sys.argv[1]
response_file = sys.argv[2]
status_content = sys.argv[3]

try:
    # Parse status information
    status_info = json.loads(status_content)
    status = status_info.get('status', 'UNKNOWN')
    
    if status != 'VALID_JSON':
        print(f"JSON_STATUS_ERROR: {status}")
        if 'error' in status_info:
            print(f"Details: {status_info['error']}")
        sys.exit(1)
    
    # Read and parse the response file
    with open(response_file, 'r') as f:
        body = f.read().strip()
    
    if not body:
        print("EMPTY_RESPONSE: No content in response file")
        sys.exit(1)
    
    # Parse JSON safely with enhanced error handling
    try:
        data = json.loads(body)
    except json.JSONDecodeError as e:
        print(f"JSON_PARSE_ERROR: Failed to parse response file: {str(e)}")
        sys.exit(1)
    
    # Enhanced model extraction with multiple format support
    models_found = []
    
    try:
        # OpenAI-style response with "data" array
        if isinstance(data, dict) and 'data' in data:
            data_list = data['data']
            if isinstance(data_list, list):
                for item in data_list:
                    if isinstance(item, dict):
                        # Try multiple possible model ID fields
                        for id_field in ['id', 'model', 'name', 'model_name']:
                            if id_field in item and item[id_field]:
                                models_found.append(str(item[id_field]))
                                break
        
        # Direct array of model objects
        elif isinstance(data, list):
            for item in data:
                if isinstance(item, dict):
                    for id_field in ['id', 'model', 'name', 'model_name']:
                        if id_field in item and item[id_field]:
                            models_found.append(str(item[id_field]))
                            break
                elif isinstance(item, str):
                    models_found.append(item)
        
        # Simple model list in 'models' field
        elif isinstance(data, dict) and 'models' in data:
            models_list = data['models']
            if isinstance(models_list, list):
                for model in models_list:
                    if isinstance(model, str):
                        models_found.append(model)
                    elif isinstance(model, dict):
                        for id_field in ['id', 'model', 'name', 'model_name']:
                            if id_field in model and model[id_field]:
                                models_found.append(str(model[id_field]))
                                break
        
        # LM Studio specific formats
        elif isinstance(data, dict):
            # Check for other possible model list fields
            for models_field in ['available_models', 'loaded_models', 'model_list']:
                if models_field in data and isinstance(data[models_field], list):
                    models_found.extend([str(m) for m in data[models_field] if m])
        
        # Remove duplicates while preserving order
        seen = set()
        unique_models = []
        for model in models_found:
            if model not in seen:
                seen.add(model)
                unique_models.append(model)
        
        models_found = unique_models
        
    except Exception as extraction_error:
        print(f"MODEL_EXTRACTION_ERROR: {str(extraction_error)}")
        print(f"Response structure: {type(data)}")
        if isinstance(data, dict):
            print(f"Available keys: {list(data.keys())}")
        sys.exit(1)
    
    # Enhanced model matching with fuzzy search
    if not models_found:
        print("NO_MODELS_FOUND: Response contains no recognizable model list")
        print(f"Response type: {type(data)}")
        if isinstance(data, dict):
            print(f"Available fields: {list(data.keys())}")
        sys.exit(1)
    
    # Check for exact and fuzzy matches
    exact_matches, fuzzy_matches = fuzzy_match_model(model_name, models_found)
    
    if exact_matches:
        print(f"MODEL_FOUND_EXACT: {model_name} (exact match)")
        print(f"Total models available: {len(models_found)}")
        sys.exit(0)
    elif fuzzy_matches:
        best_match, similarity_score = fuzzy_matches[0]
        if similarity_score >= 0.9:
            print(f"MODEL_FOUND_FUZZY: {best_match} (similarity: {similarity_score:.2f})")
            print(f"Searching for: {model_name}")
            print(f"Total models available: {len(models_found)}")
            sys.exit(0)
        else:
            print(f"MODEL_NOT_FOUND: {model_name}")
            print(f"Closest match: {best_match} (similarity: {similarity_score:.2f})")
            print(f"Available models: {models_found[:5]}{'...' if len(models_found) > 5 else ''}")
            sys.exit(1)
    else:
        print(f"MODEL_NOT_FOUND: {model_name}")
        print(f"Available models: {models_found[:10]}{'...' if len(models_found) > 10 else ''}")
        print(f"Total models: {len(models_found)}")
        sys.exit(1)

except Exception as e:
    print(f"ENHANCED_CHECK_ERROR: {str(e)}")
    sys.exit(1)
PY
}

# Function to test the enhanced JSON parsing
test_enhanced_json_parsing() {
  echo "Testing enhanced JSON parsing functions..."
  
  # Test 1: Valid JSON response
  echo '{"data": [{"id": "test-model-1"}, {"id": "test-model-2"}]}' > /tmp/test_response.txt
  if enhanced_check_model_in_response "test-model-1" "/tmp/test_response.txt"; then
    echo "✅ Test 1 passed: Valid JSON with exact match"
  else
    echo "❌ Test 1 failed: Valid JSON with exact match"
  fi
  
  # Test 2: Fuzzy matching
  if enhanced_check_model_in_response "test-model" "/tmp/test_response.txt"; then
    echo "✅ Test 2 passed: Fuzzy matching"
  else
    echo "❌ Test 2 failed: Fuzzy matching"
  fi
  
  # Test 3: Invalid JSON
  echo '{"invalid": json}' > /tmp/test_response.txt
  echo '{"status":"INVALID_JSON","errors":["JSON parse error"]}' > /tmp/lm_json_status.txt
  if ! enhanced_check_model_in_response "test-model" "/tmp/test_response.txt" 2>/dev/null; then
    echo "✅ Test 3 passed: Invalid JSON properly rejected"
  else
    echo "❌ Test 3 failed: Invalid JSON not properly rejected"
  fi
  
  # Cleanup
  rm -f /tmp/test_response.txt /tmp/lm_json_status.txt
  
  echo "Enhanced JSON parsing tests completed"
}

# If script is run directly, run tests
if [ "${0##*/}" = "enhanced_json_parsing.sh" ]; then
  test_enhanced_json_parsing
fi