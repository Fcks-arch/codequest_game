-- Java-native guided content for Island 1, Levels 6 through 10.
-- Safe to re-run: replaces only these lessons' guided steps.
USE codequest;

SET @level6_id = (SELECT id FROM lessons WHERE module_id = 1 AND level_label = 'Level 6' AND title = 'Change the Pace' LIMIT 1);
SET @level7_id = (SELECT id FROM lessons WHERE module_id = 1 AND level_label = 'Level 7' AND title = 'Constant Compass' LIMIT 1);
SET @level8_id = (SELECT id FROM lessons WHERE module_id = 1 AND level_label = 'Level 8' AND title = 'Number or Text?' LIMIT 1);
SET @level9_id = (SELECT id FROM lessons WHERE module_id = 1 AND level_label = 'Level 9' AND title = 'Math March' LIMIT 1);
SET @level10_id = (SELECT id FROM lessons WHERE module_id = 1 AND level_label = 'Level 10' AND title = 'Foundations Trial' LIMIT 1);

UPDATE lessons SET track = 'JAVA FOUNDATIONS',
  briefing = 'In Java, variable values can be updated as your program runs. Store an initial integer, increase its value using an arithmetic assignment operator, then pass it to Pip.',
  hint = 'int pace = 2; pace += 3; pip.moveRight(pace); shows how variables hold dynamic state. In Java, writing pace =+ 3; isn''t a compiler error—it silently means pace = (+3) (setting pace directly to positive 3), which is why += is the required compound operator.',
  goal = 'Update an integer variable, then move Pip 5 tiles.' WHERE id = @level6_id;
UPDATE lessons SET track = 'JAVA FOUNDATIONS',
  briefing = 'Use the final keyword in Java when a variable''s value should remain constant and locked after initialization.',
  hint = 'Writing final int DIRECTION = 3; creates an immutable value in Java. If any line of code tries to reassign a final variable later, the javac compiler will reject it with an error.',
  goal = 'Use a final integer constant to control Pip''s movement.' WHERE id = @level7_id;
UPDATE lessons SET track = 'JAVA FOUNDATIONS',
  briefing = 'Java enforces strong typing. Whole numbers (int) execute movements, while text strings (String) deliver messages.',
  hint = 'int distance = 4; String message = "Onward!"; shows two distinct Java types. Java will not let you pass a String into a method expecting an int without explicit conversion.',
  goal = 'Declare an integer for movement and a String for speech output.' WHERE id = @level8_id;
UPDATE lessons SET track = 'JAVA FOUNDATIONS',
  briefing = 'Java evaluates mathematical expressions before passing the result into a method call.',
  hint = 'pip.moveRight(2 + 3); causes Java''s execution engine to compute 2 + 3 down to 5 first, then pass 5 directly to moveRight().',
  goal = 'Use an inline arithmetic expression to move Pip at least 5 tiles.' WHERE id = @level9_id;
UPDATE lessons SET track = 'JAVA FOUNDATIONS',
  briefing = 'Combine variable declarations, String output, and method calls in a clean Java sequence.',
  hint = 'Declare typed variables, call an output method, then execute an action. This sequence forms the structure of real-world Java program blocks.',
  goal = 'Declare an int, call say(), and move Pip 6 tiles.' WHERE id = @level10_id;

DELETE FROM guided_steps WHERE lesson_id IN (@level6_id, @level7_id, @level8_id, @level9_id, @level10_id);

INSERT INTO guided_steps (lesson_id, step_order, prompt, correct_snippet, distractor_1, distractor_2, distractor_3) VALUES
(@level6_id, 1, 'Declare an integer variable named pace set to 2.', 'int pace = 2;', 'int pace = "2";', 'pace = 2;', 'int pace == 2;'),
(@level6_id, 2, 'Increase pace by 3 using the += addition assignment operator.', 'pace += 3;', 'pace =+ 3;', 'pace -= 3;', 'pace += "3";'),
(@level6_id, 3, 'Now pass the updated pace variable to move Pip.', 'moveRight(pace);', 'moveRight(Pace);', 'moveRight(2);', 'pace += 5;'),
(@level7_id, 1, 'Which line creates a constant integer named direction set to 3?', 'final int direction = 3;', 'int direction = 3;', 'Final int direction = 3;', 'final int direction == 3;'),
(@level7_id, 2, 'Now pass the constant to direct Pip.', 'moveRight(direction);', 'moveRight(Direction);', 'moveRight("direction");', 'moveRight(2);'),
(@level8_id, 1, 'Store the travel distance as a primitive integer.', 'int distance = 4;', 'int distance = "4";', 'Int distance = 4;', 'int distance == 4;'),
(@level8_id, 2, 'Declare a greeting using the Java String class.', 'String message = "Onward!";', 'String message = Onward!;', 'string message = "Onward!";', 'String message = 5;'),
(@level8_id, 3, 'Make Pip speak the message string.', 'say(message);', 'say(Message);', 'Say(message);', 'System.print(message);'),
(@level8_id, 4, 'Now move Pip using the stored integer distance.', 'moveRight(distance);', 'moveRight(Distance);', 'moveRight(message);', 'moveRight(2);'),
(@level9_id, 1, 'Which expression uses valid Java arithmetic to calculate the distance?', 'moveRight(2 + 3);', 'moveRight("2+3");', 'moveRight(2 - 5);', 'moveRight(2, 3);'),
(@level10_id, 1, 'Declare an integer for your travel distance.', 'int distance = 6;', 'int distance = "6";', 'final int distance = 6;', 'int distance == 6;'),
(@level10_id, 2, 'Have Pip greet the player before taking a step.', 'say("Here we go!");', 'Say("Here we go!");', 'say(Here we go!);', 'moveRight("Here we go!");'),
(@level10_id, 3, 'Move Pip the full distance stored in the variable.', 'moveRight(distance);', 'moveRight(Distance);', 'moveRight(3);', 'moveRight(-distance);');
