-- Java-native guided content for Island 2: Algorithms and Program Logic.
-- Safe to re-run: replaces only Island 2 lesson metadata and guided steps.
USE codequest;

SET @island2_ids = NULL;

UPDATE lessons
SET track = 'ALGORITHMS AND PROGRAM LOGIC',
    briefing = CASE id
      WHEN 11 THEN 'In Java, an algorithm is a clear sequence of typed method calls. Each statement ends with a semicolon and runs from top to bottom.'
      WHEN 12 THEN 'Java executes statements in the order they appear. A readable algorithm places the movement method call before the final message.'
      WHEN 13 THEN 'In Java, declare an integer with its type before using it as a method parameter. The variable name is case-sensitive.'
      WHEN 14 THEN 'A Java algorithm can combine several typed method calls into a predictable route. Keep each call on its own semicolon-terminated line.'
      WHEN 15 THEN 'Java evaluates an integer expression before passing its result to a method. Declare typed values before using arithmetic with them.'
      WHEN 16 THEN 'Java String values can document algorithm checkpoints. Declare each String before passing it to the output method.'
      WHEN 17 THEN 'Java variables make an algorithm easier to refine. Declare an int step value, then reuse it in a movement method call.'
      WHEN 18 THEN 'Java can calculate a method argument from multiple integer variables. Declare both operands as int values before adding them.'
      WHEN 19 THEN 'A Java algorithm is easier to debug when String checkpoint messages surround each movement method call.'
      WHEN 20 THEN 'A complete Java algorithm combines typed variables, String output, method calls, and a predictable sequence of statements.'
    END,
    hint = CASE id
      WHEN 11 THEN 'Use Java statements such as say("Start");, moveRight(3);, and jump(1);.'
      WHEN 12 THEN 'Put moveRight(3); before say("Arrived");. Java is case-sensitive.'
      WHEN 13 THEN 'Declare int distance = 4; before calling moveRight(distance);.'
      WHEN 14 THEN 'Use two movement calls and one jump call, each ending with ;.'
      WHEN 15 THEN 'Declare int base = 3; and use moveRight(base * 2);.'
      WHEN 16 THEN 'Declare String start = "Start"; and String finish = "Finish"; before calling say(start); and say(finish);.'
      WHEN 17 THEN 'Use int step = 2; followed by moveRight(step);.'
      WHEN 18 THEN 'Declare int speed = 3; and int bonus = 4;, then call moveRight(speed + bonus);.'
      WHEN 19 THEN 'Use String checkpoint = "Checkpoint"; and place say(checkpoint); before each movement stage.'
      WHEN 20 THEN 'Use typed declarations such as int distance = 9; and String status = "Ready";, then call methods in sequence.'
    END,
    goal = CASE id
      WHEN 11 THEN 'Make Pip speak, move, and jump in a Java sequence.'
      WHEN 12 THEN 'Move Pip, then say a completion message in Java.'
      WHEN 13 THEN 'Declare an int distance and pass it to moveRight.'
      WHEN 14 THEN 'Complete a route with two moves and a jump.'
      WHEN 15 THEN 'Use a typed variable expression to move at least 6 tiles.'
      WHEN 16 THEN 'Show two String messages while completing a route.'
      WHEN 17 THEN 'Use an int step variable to complete an 8-tile route.'
      WHEN 18 THEN 'Move using an expression made from two int variables.'
      WHEN 19 THEN 'Use two String checkpoints and two movement stages.'
      WHEN 20 THEN 'Use typed variables, two messages, a jump, and reach 9 tiles.'
    END,
    required_code_pattern = CASE id
      WHEN 11 THEN 'say[[:space:]]*\\([\\s\\S]*moveRight[[:space:]]*\\([\\s\\S]*jump[[:space:]]*\\('
      WHEN 12 THEN 'moveRight[\\s\\S]*say'
      WHEN 13 THEN 'int[\\s\\S]*moveRight[[:space:]]*\\([[:space:]]*distance'
      WHEN 14 THEN 'moveRight[\\s\\S]*jump[\\s\\S]*moveRight'
      WHEN 15 THEN 'int[\\s\\S]*\\*[^;]*moveRight'
      WHEN 16 THEN 'String[\\s\\S]*say[\\s\\S]*String[\\s\\S]*say'
      WHEN 17 THEN 'int[[:space:]]+step[\\s\\S]*moveRight[[:space:]]*\\([[:space:]]*step'
      WHEN 18 THEN 'int[\\s\\S]*int[\\s\\S]*moveRight[[:space:]]*\\([\\s\\S]*\\+'
      WHEN 19 THEN 'String[\\s\\S]*say[\\s\\S]*moveRight[\\s\\S]*say[\\s\\S]*moveRight'
      WHEN 20 THEN 'int[\\s\\S]*String[\\s\\S]*say[\\s\\S]*jump'
    END
WHERE module_id = 2 AND id BETWEEN 11 AND 20;

DELETE FROM guided_steps WHERE lesson_id IN (SELECT id FROM lessons WHERE module_id = 2);

INSERT INTO guided_steps (lesson_id, step_order, prompt, correct_snippet, distractor_1, distractor_2, distractor_3) VALUES
(11, 1, 'Which Java statement sends a starting message from Pip?', 'say("Start");', 'Say("Start");', 'say(Start);', 'System.out.println("Start");'),
(11, 2, 'Which Java method call moves Pip three tiles?', 'moveRight(3);', 'moveRight("3");', 'moveright(3);', 'moveRight();'),
(11, 3, 'Which Java statement makes Pip jump after moving?', 'jump(1);', 'Jump(1);', 'jump("1");', 'jump(1, 0);'),
(12, 1, 'Which Java statement moves Pip before the completion message?', 'moveRight(3);', 'moveRight("3");', 'MoveRight(3);', 'moveRight();'),
(12, 2, 'Which Java statement outputs a completion message?', 'say("Arrived");', 'say(Arrived);', 'Say("Arrived");', 'System.print("Arrived");'),
(12, 3, 'Which Java statement should complete the route after the movement?', 'say("Arrived");', 'moveRight(3);', 'say(Arrived);', 'Say("Arrived");'),
(13, 1, 'Which Java statement declares an integer distance?', 'int distance = 4;', 'distance = 4;', 'Integer distance = "4";', 'int Distance = 4;'),
(13, 2, 'Which Java call uses the declared variable as a parameter?', 'moveRight(distance);', 'moveRight(Distance);', 'moveRight("distance");', 'MoveRight(distance);'),
(13, 3, 'Which Java statement uses the declared distance while keeping it in scope?', 'moveRight(distance);', 'moveRight(Distance);', 'moveRight("distance");', 'MoveRight(distance);'),
(14, 1, 'Which Java call completes the first movement stage?', 'moveRight(2);', 'moveRight("2");', 'MoveRight(2);', 'moveRight();'),
(14, 2, 'Which Java call clears the checkpoint gap?', 'jump(1);', 'jump("1");', 'Jump(1);', 'jump(1, 1);'),
(14, 3, 'Which Java call completes the second movement stage?', 'moveRight(3);', 'moveRight("3");', 'moveright(3);', 'moveRight(3.0);'),
(15, 1, 'Which Java statement declares a typed base value?', 'int base = 3;', 'base = 3;', 'var base = 3;', 'Integer base = "3";'),
(15, 2, 'Which Java statement stores the multiplied result in a typed variable?', 'int calculated = base * 2;', 'int calculated = base * "2";', 'int Calculated = Base * 2;', 'int calculated == base * 2;'),
(15, 3, 'Which Java call uses the calculated expression?', 'moveRight(base * 2);', 'moveRight(base * "2");', 'MoveRight(base * 2);', 'moveRight(base, 2);'),
(16, 1, 'Which Java statement declares the starting checkpoint text?', 'String start = "Start";', 'string start = "Start";', 'String start = Start;', 'start = "Start";'),
(16, 2, 'Which Java statement displays a String variable?', 'say(start);', 'say(Start);', 'Say(start);', 'say("start");'),
(16, 3, 'Which Java statement declares the finish checkpoint text?', 'String finish = "Finish";', 'String finish = Finish;', 'string finish = "Finish";', 'finish = "Finish";'),
(17, 1, 'Which Java statement declares the reusable step size?', 'int step = 2;', 'step = 2;', 'var step = 2;', 'int Step = 2;'),
(17, 2, 'Which Java call reuses the step variable?', 'moveRight(step);', 'moveRight(Step);', 'moveRight("step");', 'MoveRight(step);'),
(17, 3, 'Which Java statement reuses the typed step while keeping it in scope?', 'moveRight(step);', 'moveRight(Step);', 'moveRight("step");', 'MoveRight(step);'),
(18, 1, 'Which Java statement declares the first integer operand?', 'int speed = 3;', 'speed = 3;', 'var speed = 3;', 'int Speed = "3";'),
(18, 2, 'Which Java statement declares the second integer operand?', 'int bonus = 4;', 'bonus = 4;', 'int bonus = "4";', 'Integer bonus = 4;'),
(18, 3, 'Which Java call adds both integer variables before moving?', 'moveRight(speed + bonus);', 'moveRight(speed + Bonus);', 'moveRight("speed + bonus");', 'MoveRight(speed + bonus);'),
(19, 1, 'Which Java statement declares a checkpoint message?', 'String checkpoint = "Checkpoint";', 'string checkpoint = "Checkpoint";', 'String checkpoint = Checkpoint;', 'checkpoint = "Checkpoint";'),
(19, 2, 'Which Java sequence reports before the first movement?', 'say(checkpoint);\nmoveRight(3);', 'say(Checkpoint);\nmoveRight(3);', 'Say(checkpoint);\nmoveRight(3);', 'say(checkpoint);\nmoveRight("3");'),
(19, 3, 'Which Java sequence reports again before the second movement?', 'say(checkpoint);\nmoveRight(3);', 'say(Checkpoint);\nmoveRight(3);', 'say(checkpoint);\nMoveRight(3);', 'say(checkpoint);\nmoveRight();'),
(20, 1, 'Which Java statement declares the travel distance?', 'int distance = 9;', 'distance = 9;', 'var distance = 9;', 'int distance = "9";'),
(20, 2, 'Which Java statement declares typed status text?', 'String status = "Ready";', 'string status = "Ready";', 'String status = Ready;', 'status = "Ready";'),
(20, 3, 'Which Java sequence uses the typed values and a jump?', 'say(status);\nmoveRight(distance);\njump(1);', 'say(Status);\nmoveRight(distance);\njump(1);', 'say(status);\nmoveRight("distance");\njump(1);', 'Say(status);\nmoveRight(distance);\nJump(1);');
