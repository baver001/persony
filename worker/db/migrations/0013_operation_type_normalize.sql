-- Align inference_runs.operation_type with model registry canonical names.
UPDATE inference_runs SET operation_type = 'chat_text' WHERE operation_type = 'text_chat';
UPDATE inference_runs SET operation_type = 'voice_call' WHERE operation_type = 'live_voice';
UPDATE inference_runs SET operation_type = 'call_summary' WHERE operation_type = 'summarize_call';
UPDATE inference_runs SET operation_type = 'avatar_generation' WHERE operation_type = 'generate_avatar';
UPDATE inference_runs SET operation_type = 'persona_generation' WHERE operation_type = 'generate_character';
