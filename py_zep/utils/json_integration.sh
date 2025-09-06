#!/bin/sh
# JSON parsing integration for start-wrapper.sh
# This script provides enhanced JSON parsing functions that can be sourced
# by the existing start-wrapper.sh to improve its robustness

# Source the enhanced JSON parsing functions
SCRIPT_DIR="$(dirname "$0")"
if [ -f "$SCRIPT_DIR/enhanced_json_parsing.sh" ]; then
    . "$SCRIPT_DIR/enhanced_json_parsing.sh"
else
    echo "Warning: Enhanced JSON parsing functions not found"
fi

# Enhanced wrapper for the existing do_get function
enhanced_do_get_wrapper() {
    local url="$1"
    local api_key="$2"
    local use_enhanced="${3:-true}"
    
    if [ "$use_enhanced" = "true" ] && command -v enhanced_do_get >/dev/null 2>&1; then
        echo "Using enhanced JSON parsing..."
        enhanced_do_get "$url" "$api_key"
    else
        echo "Using standard JSON parsing..."
        # Call the original do_get function (would need to be defined or sourced)
        # do_get "$url" "$api_key"
        echo "Standard do_get function would be called here"
    fi
}

# Enhanced wrapper for the existing check_model_in_response function
enhanced_check_model_wrapper() {
    local model_name="$1"
    local response_file="$2"
    local use_enhanced="${3:-true}"
    
    if [ "$use_enhanced" = "true" ] && command -v enhanced_check_model_in_response >/dev/null 2>&1; then
        echo "Using enhanced model checking..."
        enhanced_check_model_in_response "$model_name" "$response_file"
    else
        echo "Using standard model checking..."
        # Call the original check_model_in_response function
        # check_model_in_response "$model_name" "$response_file"
        echo "Standard check_model_in_response function would be called here"
    fi
}

# Function to patch existing start-wrapper.sh with enhanced functions
patch_start_wrapper() {
    local start_wrapper_path="$1"
    local backup_path="${start_wrapper_path}.backup.$(date +%Y%m%d_%H%M%S)"
    
    if [ ! -f "$start_wrapper_path" ]; then
        echo "Error: start-wrapper.sh not found at $start_wrapper_path"
        return 1
    fi
    
    echo "Creating backup at $backup_path"
    cp "$start_wrapper_path" "$backup_path"
    
    # Create a patched version that sources enhanced functions
    cat > "${start_wrapper_path}.enhanced" << 'PATCH_EOF'
#!/bin/sh
# Enhanced version of start-wrapper.sh with improved JSON parsing

# Source enhanced JSON parsing functions
UTILS_DIR="$(dirname "$0")/utils"
if [ -f "$UTILS_DIR/enhanced_json_parsing.sh" ]; then
    . "$UTILS_DIR/enhanced_json_parsing.sh"
    echo "Loaded enhanced JSON parsing functions"
    USE_ENHANCED_JSON=true
else
    echo "Enhanced JSON parsing not available, using standard functions"
    USE_ENHANCED_JSON=false
fi

# Override do_get function if enhanced version is available
if [ "$USE_ENHANCED_JSON" = "true" ] && command -v enhanced_do_get >/dev/null 2>&1; then
    do_get() {
        enhanced_do_get "$@"
    }
    echo "Using enhanced do_get function"
fi

# Override check_model_in_response function if enhanced version is available
if [ "$USE_ENHANCED_JSON" = "true" ] && command -v enhanced_check_model_in_response >/dev/null 2>&1; then
    check_model_in_response() {
        enhanced_check_model_in_response "$@"
    }
    echo "Using enhanced check_model_in_response function"
fi

PATCH_EOF

    # Append the original start-wrapper.sh content (excluding the shebang)
    tail -n +2 "$start_wrapper_path" >> "${start_wrapper_path}.enhanced"
    
    echo "Enhanced version created at ${start_wrapper_path}.enhanced"
    echo "To use the enhanced version:"
    echo "  mv '$start_wrapper_path' '${start_wrapper_path}.original'"
    echo "  mv '${start_wrapper_path}.enhanced' '$start_wrapper_path'"
    echo "  chmod +x '$start_wrapper_path'"
}

# Function to test the integration
test_integration() {
    local test_dir="/tmp/json_integration_test"
    
    echo "Testing JSON parsing integration..."
    mkdir -p "$test_dir"
    
    # Create test files
    echo '{"data": [{"id": "llama3.1"}, {"id": "mistral"}]}' > "$test_dir/test_models.json"
    echo '{"status": "VALID_JSON", "structure_type": "openai_models"}' > "$test_dir/status.json"
    
    # Test enhanced functions
    if command -v enhanced_check_model_in_response >/dev/null 2>&1; then
        echo "Testing enhanced model detection..."
        
        # Copy test files to expected locations
        cp "$test_dir/test_models.json" /tmp/lm_list_resp.txt
        cp "$test_dir/status.json" /tmp/lm_json_status.txt
        
        if enhanced_check_model_in_response "llama3.1" "/tmp/lm_list_resp.txt"; then
            echo "✅ Enhanced model detection test passed"
        else
            echo "❌ Enhanced model detection test failed"
        fi
        
        # Test fuzzy matching
        if enhanced_check_model_in_response "llama" "/tmp/lm_list_resp.txt"; then
            echo "✅ Enhanced fuzzy matching test passed"
        else
            echo "❌ Enhanced fuzzy matching test failed"
        fi
    else
        echo "❌ Enhanced functions not available for testing"
    fi
    
    # Cleanup
    rm -rf "$test_dir"
    rm -f /tmp/lm_list_resp.txt /tmp/lm_json_status.txt
    
    echo "Integration testing completed"
}

# Main execution when script is run directly
if [ "${0##*/}" = "json_integration.sh" ]; then
    case "${1:-test}" in
        "patch")
            if [ -z "$2" ]; then
                echo "Usage: $0 patch <path_to_start_wrapper.sh>"
                exit 1
            fi
            patch_start_wrapper "$2"
            ;;
        "test")
            test_integration
            ;;
        *)
            echo "Usage: $0 {patch|test}"
            echo "  patch <path> - Create enhanced version of start-wrapper.sh"
            echo "  test        - Test the integration functions"
            exit 1
            ;;
    esac
fi