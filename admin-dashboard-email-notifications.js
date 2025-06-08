{
  "prompt": "Match this student name '{{$json.student_name}}' with the correct student from our database.\n\nAvailable students:\n{{$json.students_list}}\n\nReturn JSON:\n{\n  \"matched_student_id\": \"ID of best match or null\",\n  \"confidence\": \"high/medium/low\",\n  \"reasoning\": \"why this match was chosen\"\n}"
} 