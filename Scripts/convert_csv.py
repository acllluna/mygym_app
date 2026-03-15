import csv
import json
import uuid

def convert_csv_to_json(csv_path, json_path):
    exercises = []
    
    with open(csv_path, mode='r', encoding='utf-8-sig') as file:
        reader = csv.DictReader(file)
        
        for row in reader:
            # We must map to the Exercise interface expected by our App
            # Types: weighted, bodyweight, cardio, assisted, duration
            # Looking at the equipment, we can roughly classify type
            equipment = row.get('equipment', '').lower()
            ex_type = 'weighted'
            if 'body weight' in equipment or 'bodyweight' in equipment:
                ex_type = 'bodyweight'
            elif 'assisted' in equipment:
                ex_type = 'assisted'
            elif 'cardio' in equipment or 'elliptical' in equipment:
                ex_type = 'cardio'
                
            # Create a clean ID since the db needs a unique string id
            exercise_id = str(uuid.uuid4())
            
            # Use local paths for the app images rather than absolute paths on disk
            # Extracted id e.g., '0001' from the CSV
            original_id = row.get('exercise_id', '').strip()
            
            # Clean up instructions formatting (split by | into an array, or just keep as string)
            raw_instructions = row.get('instructions', '')
            # Keeping as a single string, but replacing ' | ' with newline for better markdown/display
            clean_instructions = raw_instructions.replace(' | ', '\n')
            
            exercise = {
                'id': exercise_id,
                'name': row.get('name', 'Unknown Exercise').title(),
                'description': clean_instructions,
                'muscleGroup': row.get('target_muscle', '').title(),
                'equipment': row.get('equipment', '').title(),
                'type': ex_type,
                'thumbnail_url': f'/thumbnail/{original_id}.jpg' if original_id else '',
                'gif_url': f'/gif/{original_id}.gif' if original_id else '',
                # Extra metadata for grouping we can use later if we expand the interface
                'bodyPart': row.get('body_part', '').title(),
                'secondaryMuscles': [m.strip().title() for m in row.get('secondary_muscles', '').split(',') if m.strip()],
            }
            exercises.append(exercise)
            
    with open(json_path, mode='w', encoding='utf-8') as file:
        json.dump(exercises, file, indent=2)

    return len(exercises)

if __name__ == '__main__':
    csv_file = 'exercise library/exercises_for_ai_studio.csv'
    json_file = 'public/exercises.json'
    count = convert_csv_to_json(csv_file, json_file)
    print(f"Successfully converted {count} exercises to JSON.")
