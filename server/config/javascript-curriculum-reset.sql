-- CodeQuest JavaScript curriculum: 8 islands x 10 levels.
-- IMPORTANT: This replaces the previous Java-oriented activities and clears
-- student lesson progress. Create a database backup before running it.
USE codequest;

ALTER TABLE lessons
  ADD COLUMN min_moves INT DEFAULT 0,
  ADD COLUMN min_says INT DEFAULT 0,
  ADD COLUMN min_jumps INT DEFAULT 0,
  ADD COLUMN required_code_label VARCHAR(150),
  ADD COLUMN required_code_pattern VARCHAR(500);

DELETE FROM student_progress;
DELETE FROM lessons;
DELETE FROM lesson_modules;
ALTER TABLE lessons AUTO_INCREMENT = 1;
ALTER TABLE lesson_modules AUTO_INCREMENT = 1;

INSERT INTO lesson_modules (id, title, description, color, order_index) VALUES
(1, 'JavaScript Foundations', 'Commands, sequence, and your first JavaScript values.', '#22C55E', 1),
(2, 'Algorithms and Program Logic', 'Plan, trace, and turn a solution into working code.', '#4F46E5', 2),
(3, 'Variables, Data Types, and Operators', 'Use values and expressions to solve challenges.', '#F59E0B', 3),
(4, 'Output and Debugging', 'Communicate clearly and trace a program with Pip.', '#22C55E', 4),
(5, 'Decisions and Conditions', 'Choose the correct route with comparisons and if statements.', '#4F46E5', 5),
(6, 'Loops and Repetition', 'Repeat actions safely with while, do-while, and for loops.', '#F59E0B', 6),
(7, 'Branching and Flow Control', 'Control a loop precisely with break and continue.', '#22C55E', 7),
(8, 'Strings and Template Literals', 'Create, combine, and format text with JavaScript.', '#4F46E5', 8);

-- The client turns this lesson data into a briefing, starter snippet, and
-- guided code questions before students continue to Free Code mode.
INSERT INTO lessons
(module_id, level_label, track, title, briefing, hint, goal, xp_reward, target_tiles, min_moves, min_says, min_jumps, required_code_label, required_code_pattern, order_index)
VALUES
-- ISLAND 1: JavaScript Foundations
(1,'Level 1','JavaScript Foundations','First Command','JavaScript runs instructions one after another. Pip does not move until you give it a command, so the first step is deciding what action starts the path toward the flag.','Think about the very first action that gets Pip moving toward the goal.','Move Pip 3 tiles.',30,3,3,0,0,NULL,NULL,1),
(1,'Level 2','JavaScript Foundations','Two-Step Trail','A program is clearer when you split a task into several small actions. This lesson helps students see that a single path can be built from multiple commands happening in order.','Think about how a longer route can be broken into smaller steps.','Move Pip in two separate commands for 4 or more tiles.',35,4,4,0,0,'Use two movement commands','moveRight[\\s\\S]*moveRight',2),
(1,'Level 3','JavaScript Foundations','Pip Speaks','Programs can do more than move. This activity introduces output, where a command tells Pip to say something before continuing the route.','Think about the moment when Pip should speak before moving on.','Make Pip say a greeting, then reach the flag.',35,3,3,1,0,'Use say()','say',3),
(1,'Level 4','JavaScript Foundations','Jump Start','A good JavaScript plan often combines movement with other actions. In this task, Pip needs a small jump as part of the sequence, helping students understand that commands can be mixed in one program.','Think about where the jump fits in the route so the sequence still makes sense.','Reach the flag and make Pip jump once.',40,4,4,0,1,'Use jump()','jump',4),
(1,'Level 5','JavaScript Foundations','Name a Value','A variable gives a name to a value so the program is easier to read and reuse. Students practice storing a number and then using that stored value to guide Pip.','Think about which value should be saved first so you can use it later in the move.','Declare a variable and use it in moveRight.',45,3,3,0,0,'Declare a variable with let','let',5),
(1,'Level 6','JavaScript Foundations','Change the Pace','Variables can be updated as the program runs.','Use += to increase a value.','Update a movement variable, then reach 5 tiles.',50,5,5,0,0,'Update a variable with +=','\\+=',6),
(1,'Level 7','JavaScript Foundations','Constant Compass','Use const when a value should not be reassigned.','Create const direction = 3.','Use a const value to control Pip movement.',50,3,3,0,0,'Declare a constant','const',7),
(1,'Level 8','JavaScript Foundations','Number or Text?','Numbers move Pip; strings are text for messages.','Declare one number and one string.','Use a number for movement and a string with say().',55,4,4,1,0,'Declare both a number and a string','(let|const)[\\s\\S]*["\'`]',8),
(1,'Level 9','JavaScript Foundations','Math March','JavaScript evaluates arithmetic before passing a value to a function.','Try moveRight(2 + 3).','Use an arithmetic expression to reach at least 5 tiles.',55,5,5,0,0,'Use +, -, *, /, or % in movement','[+*/%-]',9),
(1,'Level 10','JavaScript Foundations','Foundations Trial','Put sequence, variables, output, and movement together.','Name your distance, greet Pip, then move.','Use let, say(), and move Pip 6 tiles.',70,6,6,1,0,'Use a variable in a JavaScript program','let[\\s\\S]*say',10),
-- ISLAND 2: Algorithms and Program Logic
(2,'Level 1','Algorithms and Program Logic','Plan the Route','An algorithm is a clear sequence of steps.','Use three commands in a sensible order.','Make Pip speak, move, and jump.',35,3,3,1,1,'Use a three-command sequence','say[\\s\\S]*moveRight[\\s\\S]*jump',1),
(2,'Level 2','Algorithms and Program Logic','Order Matters','Changing the command order changes the result.','Move before the final message.','Move Pip, then say a completion message.',35,3,3,1,0,'Put moveRight before say','moveRight[\\s\\S]*say',2),
(2,'Level 3','Algorithms and Program Logic','Trace the Value','Trace a variable from declaration to use.','Set distance, then use distance.','Declare distance and pass it to moveRight.',40,4,4,0,0,'Use the same variable in moveRight','let[\\s\\S]*moveRight\\s*\\(\\s*distance',3),
(2,'Level 4','Algorithms and Program Logic','Checkpoint Recipe','Break a route into small predictable actions.','Use two moves and one jump.','Complete a route with two moves and a jump.',45,5,5,0,1,'Use two movement commands','moveRight[\\s\\S]*jump[\\s\\S]*moveRight',4),
(2,'Level 5','Algorithms and Program Logic','Calculated Plan','Algorithms can use values calculated from earlier steps.','Store a base value then multiply it.','Use a variable expression to move at least 6 tiles.',50,6,6,0,0,'Use multiplication with a variable','[A-Za-z_][A-Za-z0-9_]*\\s*\\*',5),
(2,'Level 6','Algorithms and Program Logic','Message Trail','Use output to show where the program is in its algorithm.','Give Pip a start and finish message.','Show two messages while completing a route.',50,4,4,2,0,'Use two say() commands','say[\\s\\S]*say',6),
(2,'Level 7','Algorithms and Program Logic','Stepwise Refinement','Solve a large route by naming a smaller movement value.','Use a variable named step.','Use step to complete an 8-tile route.',55,8,8,0,0,'Declare step','let\\s+step',7),
(2,'Level 8','Algorithms and Program Logic','Logic Relay','Use the result of an expression as the next instruction.','Try speed + bonus.','Move using an expression made from two variables.',60,7,7,0,0,'Use two variables in an expression','[A-Za-z_][A-Za-z0-9_]*\\s*[+*]\\s*[A-Za-z_]',8),
(2,'Level 9','Algorithms and Program Logic','Route Debug','A predictable route is easy to test and repair.','Use a message before each movement stage.','Use two messages and two movement stages.',60,6,6,2,0,'Alternate messages and movement','say[\\s\\S]*moveRight[\\s\\S]*say[\\s\\S]*moveRight',9),
(2,'Level 10','Algorithms and Program Logic','Logic Mastery','Design your own readable plan for Pip.','Use named values and clear checkpoints.','Use variables, two messages, a jump, and reach 9 tiles.',75,9,9,2,1,'Use at least two variable declarations','(let|const)[\\s\\S]*(let|const)',10),
-- ISLAND 3: Variables, Data Types, and Operators
(3,'Level 1','Variables, Data Types, and Operators','Numeric Storage','Store a whole number in a variable.','Use let tiles = 4.','Declare a numeric variable and move 4 tiles.',40,4,4,0,0,'Declare a numeric variable','let\\s+\\w+\\s*=\\s*\\d+',1),
(3,'Level 2','Variables, Data Types, and Operators','String Storage','Strings hold text in quotes.','Use let message = "Hello".','Declare a string and display it.',40,0,0,1,0,'Declare a string variable','let\\s+\\w+\\s*=\\s*["\'`]',2),
(3,'Level 3','Variables, Data Types, and Operators','Boolean Gate','A boolean value is true or false.','Set ready = true and use an if statement.','Declare a boolean and use it in a condition.',45,3,3,0,0,'Use true or false','\\b(true|false)\\b',3),
(3,'Level 4','Variables, Data Types, and Operators','Addition Boost','The + operator adds numbers.','Add two values inside moveRight.','Use addition to move at least 6 tiles.',45,6,6,0,0,'Use the addition operator','\\+',4),
(3,'Level 5','Variables, Data Types, and Operators','Multiply Distance','The * operator repeats a numeric factor.','Try distance * 2.','Use multiplication to move at least 8 tiles.',50,8,8,0,0,'Use the multiplication operator','\\*',5),
(3,'Level 6','Variables, Data Types, and Operators','Remainder Check','The % operator gives a remainder.','Use a remainder in a condition.','Use % and an if statement to control movement.',55,3,3,0,0,'Use the remainder operator','%',6),
(3,'Level 7','Variables, Data Types, and Operators','Assignment Upgrade','Assignment operators update an existing value.','Use += or -=.','Update a variable and reach 6 tiles.',55,6,6,0,0,'Use an assignment operator','(\\+=|-=|\\*=)',7),
(3,'Level 8','Variables, Data Types, and Operators','Comparison Scout','Comparisons produce boolean values.','Compare a score with > or >=.','Use a comparison in an if statement.',60,4,4,0,0,'Use a comparison operator','(===|==|>=|<=|>|<)',8),
(3,'Level 9','Variables, Data Types, and Operators','Expression Mission','Combine arithmetic and variables in one solution.','Use two values in a calculation.','Use variables and arithmetic to reach 10 tiles.',65,10,10,0,0,'Use variables in an arithmetic expression','[A-Za-z_][A-Za-z0-9_]*\\s*[+*/-]',9),
(3,'Level 10','Variables, Data Types, and Operators','Operator Arena','Build a compact JavaScript program using values, output, and math.','Use const for a base and let for a changing value.','Use const, let, arithmetic, say(), and reach 12 tiles.',80,12,12,1,0,'Use both const and let','const[\\s\\S]*let|let[\\s\\S]*const',10),
-- ISLAND 4: Output and Debugging
(4,'Level 1','Output and Debugging','Hello Console','say() is CodeQuest output.','Give Pip a message.','Display one message and move 2 tiles.',35,2,2,1,0,'Use say()','say',1),
(4,'Level 2','Output and Debugging','Status Update','Output can explain program progress.','Use a start message before moving.','Display a start message before a 3-tile move.',40,3,3,1,0,'Output before movement','say[\\s\\S]*moveRight',2),
(4,'Level 3','Output and Debugging','Finish Line','A final message confirms program completion.','Move first, then announce success.','Move 3 tiles and display a final message.',40,3,3,1,0,'Output after movement','moveRight[\\s\\S]*say',3),
(4,'Level 4','Output and Debugging','Variable Report','Output a stored value to inspect it.','Declare score, then say(score).','Display the value of a variable.',45,0,0,1,0,'Pass a variable to say()','say\\s*\\(\\s*[A-Za-z_]',4),
(4,'Level 5','Output and Debugging','Trace Two Values','Use output to inspect more than one point in a program.','Show two messages around a move.','Use two messages and reach 4 tiles.',50,4,4,2,0,'Use two say() commands','say[\\s\\S]*say',5),
(4,'Level 6','Output and Debugging','Template Report','Template literals format output with values.','Use backticks and ${value}.','Use a template literal in say().',55,0,0,1,0,'Use a template literal','`',6),
(4,'Level 7','Output and Debugging','Trace a Loop','Output a counter while a loop runs.','Use say(i) inside a loop.','Use a loop and display a changing counter.',60,4,4,1,0,'Use say() inside a loop','(for|while)[\\s\\S]*say',7),
(4,'Level 8','Output and Debugging','Checkpoint Debugger','Add messages before and after a jump sequence.','Trace every important stage.','Use three messages, one jump, and reach 5 tiles.',65,5,5,3,1,'Use three say() commands','say[\\s\\S]*say[\\s\\S]*say',8),
(4,'Level 9','Output and Debugging','Conditional Report','Print different status based on a condition.','Use if-else with a message in each branch.','Use if-else and say() to report a route decision.',70,3,3,1,0,'Use if-else','if[\\s\\S]*else',9),
(4,'Level 10','Output and Debugging','Debugging Gauntlet','Create an observable, readable program that proves every stage works.','Use variables, messages, a loop, and a final result.','Use a loop, three messages, and reach 10 tiles.',85,10,10,3,0,'Use a loop','(for|while|do)',10),
-- ISLAND 5: Decisions and Conditions
(5,'Level 1','Decisions and Conditions','First If','An if block runs only when its condition is true.','Set ready = true.','Use if to move Pip 3 tiles.',45,3,3,0,0,'Use an if statement','if',1),
(5,'Level 2','Decisions and Conditions','Greater Than','Compare a value with >.','Use score > 2.','Use > in an if statement and reach 4 tiles.',50,4,4,0,0,'Use > in a condition','>',2),
(5,'Level 3','Decisions and Conditions','Equality Gate','Use === to test an exact value.','Compare key === 1.','Use === in an if statement.',50,3,3,0,0,'Use strict equality','===',3),
(5,'Level 4','Decisions and Conditions','Else Route','if-else selects one of two routes.','Give each branch a move.','Use if-else and reach 5 tiles.',55,5,5,0,0,'Use if-else','if[\\s\\S]*else',4),
(5,'Level 5','Decisions and Conditions','Not Ready','The ! operator reverses a boolean.','Use !ready in a condition.','Use ! in an if statement.',55,3,3,0,0,'Use logical not','!',5),
(5,'Level 6','Decisions and Conditions','Both Keys','&& requires both conditions to be true.','Test two values with &&.','Use && in a condition and reach 5 tiles.',60,5,5,0,0,'Use logical AND','&&',6),
(5,'Level 7','Decisions and Conditions','Either Path','|| allows either condition to pass.','Test two possible values.','Use || in a condition and reach 5 tiles.',60,5,5,0,0,'Use logical OR','\\|\\|',7),
(5,'Level 8','Decisions and Conditions','Nested Gate','A decision can contain another decision.','Put an if inside an if.','Use nested if statements and reach 6 tiles.',70,6,6,0,0,'Use a nested if statement','if[\\s\\S]*if',8),
(5,'Level 9','Decisions and Conditions','Decision Dialogue','Use output to explain the chosen route.','Include say() inside your decision.','Use if-else, say(), and reach 7 tiles.',75,7,7,1,0,'Use say() in an if statement','if[\\s\\S]*say',9),
(5,'Level 10','Decisions and Conditions','Condition Commander','Build a multi-condition route that handles success and fallback.','Use variables, && or ||, and if-else.','Use a compound condition, output, and reach 9 tiles.',90,9,9,1,0,'Use a compound condition','(&&|\\|\\|)',10),
-- ISLAND 6: Loops and Repetition
(6,'Level 1','Loops and Repetition','First While','A while loop repeats while its condition is true.','Update the counter inside the loop.','Use while to move at least 4 tiles.',55,4,4,0,0,'Use a while loop','while',1),
(6,'Level 2','Loops and Repetition','Safe Counter','Every while loop needs a changing counter.','Use i++.','Use while and increment a counter.',60,4,4,0,0,'Increment a counter','\\+\\+',2),
(6,'Level 3','Loops and Repetition','First For','A for loop contains setup, condition, and update.','Start i at 0.','Use a for loop to move 5 tiles.',60,5,5,0,0,'Use a for loop','for',3),
(6,'Level 4','Loops and Repetition','Looped Message','Repeated output shows each loop iteration.','Put say(i) in a for loop.','Use a loop, say(), and move 5 tiles.',65,5,5,1,0,'Use say() inside a loop','for[\\s\\S]*say',4),
(6,'Level 5','Loops and Repetition','Do Once','A do-while loop runs its body at least once.','Use do { } while (...).','Use a do-while loop and reach 4 tiles.',65,4,4,0,0,'Use a do-while loop','do[\\s\\S]*while',5),
(6,'Level 6','Loops and Repetition','Double Steps','Use a loop to repeat a two-tile movement.','Repeat moveRight(2).','Use a loop to reach 8 tiles.',70,8,8,0,0,'Use movement inside a loop','(for|while)[\\s\\S]*moveRight',6),
(6,'Level 7','Loops and Repetition','Loop Math','Use the loop counter in an expression.','Try i + 1.','Use a loop counter in moveRight().',75,7,7,0,0,'Use a loop variable in movement','moveRight\\s*\\(\\s*i',7),
(6,'Level 8','Loops and Repetition','Nested March','A loop can run inside another loop.','Use a small inner loop.','Use nested loops and reach 8 tiles.',80,8,8,0,0,'Use nested loops','for[\\s\\S]*(for|while)',8),
(6,'Level 9','Loops and Repetition','Loop Challenge','Combine output, a counter, and movement in one loop.','Show the counter as Pip travels.','Use a loop, say(), and reach 10 tiles.',85,10,10,1,0,'Use a loop with output','(for|while)[\\s\\S]*say',9),
(6,'Level 10','Loops and Repetition','Repetition Mastery','Choose the clearest loop for a long route.','Use a named step size and a loop.','Use a variable, a loop, output, and reach 12 tiles.',100,12,12,1,0,'Use a loop and a variable','(for|while)[\\s\\S]*(let|const)|((let|const)[\\s\\S]*(for|while))',10),
-- ISLAND 7: Branching and Flow Control
(7,'Level 1','Branching and Flow Control','Break Out','break exits the nearest loop immediately.','Break after a checkpoint.','Use break inside a loop and move 3 tiles.',60,3,3,0,0,'Use break','break',1),
(7,'Level 2','Branching and Flow Control','Skip a Step','continue skips the rest of one loop iteration.','Continue when i equals 2.','Use continue inside a loop and move 3 tiles.',60,3,3,0,0,'Use continue','continue',2),
(7,'Level 3','Branching and Flow Control','Break Condition','Use if to decide when a loop should stop.','Put break inside if.','Use if and break in a loop.',65,3,3,0,0,'Use break inside if','if[\\s\\S]*break',3),
(7,'Level 4','Branching and Flow Control','Continue Condition','Skip one route segment with an if condition.','Put continue inside if.','Use if and continue in a loop.',65,3,3,0,0,'Use continue inside if','if[\\s\\S]*continue',4),
(7,'Level 5','Branching and Flow Control','Count the Stops','Use output to show when control flow changes.','Say a message before break.','Use break, say(), and move 4 tiles.',70,4,4,1,0,'Output before breaking','say[\\s\\S]*break',5),
(7,'Level 6','Branching and Flow Control','Selective Steps','Move only on the iterations that pass an if test.','Use if with i % 2.','Use %, if, and a loop to move 5 tiles.',75,5,5,0,0,'Use a remainder condition','%',6),
(7,'Level 7','Branching and Flow Control','Early Exit Route','Use break to stop a long loop at the goal.','Create a loop that could run farther than needed.','Use for, if, break, and reach 6 tiles.',80,6,6,0,0,'Use for with break','for[\\s\\S]*break',7),
(7,'Level 8','Branching and Flow Control','Skip and Report','Use continue while still reporting useful route information.','Add say() in the loop.','Use continue, say(), and reach 6 tiles.',85,6,6,1,0,'Use continue in a loop','continue',8),
(7,'Level 9','Branching and Flow Control','Flow Puzzle','Combine two control-flow choices in one route.','Use both break and continue.','Use break, continue, and reach 7 tiles.',90,7,7,0,0,'Use both break and continue','break[\\s\\S]*continue|continue[\\s\\S]*break',9),
(7,'Level 10','Branching and Flow Control','Flow Control Mastery','Write a readable loop that selects, skips, and exits at the right times.','Use a for loop, conditions, output, break, and continue.','Use for, break, continue, say(), and reach 9 tiles.',105,9,9,1,0,'Use both break and continue','break[\\s\\S]*continue|continue[\\s\\S]*break',10),
-- ISLAND 8: Strings and Template Literals
(8,'Level 1','Strings and Template Literals','Text Value','A string is text inside quotes.','Declare name = "Pip".','Declare a string and display it.',50,0,0,1,0,'Declare a string','(let|const)\\s+\\w+\\s*=\\s*["\'`]',1),
(8,'Level 2','Strings and Template Literals','Join Text','The + operator concatenates text.','Join "Hello, " and a name.','Combine two strings with + and say().',55,0,0,1,0,'Use + to join text','["\'`][\\s\\S]*\\+',2),
(8,'Level 3','Strings and Template Literals','Template Hello','Template literals use backticks.','Use `Hello, ${name}`.','Display a template literal.',55,0,0,1,0,'Use backticks','`',3),
(8,'Level 4','Strings and Template Literals','Message and Move','Use a string value to narrate a route.','Say a message before moving.','Display a string and reach 3 tiles.',60,3,3,1,0,'Use a string variable','(let|const)\\s+\\w+\\s*=\\s*["\'`]',4),
(8,'Level 5','Strings and Template Literals','Score Template','Embed a number in a template literal.','Use ${score} inside backticks.','Use a template literal with a number variable.',65,0,0,1,0,'Embed a value with ${}','\\$\\{',5),
(8,'Level 6','Strings and Template Literals','Route Caption','Create two formatted messages for a route.','Use two say() calls.','Use two template or concatenated messages and reach 4 tiles.',70,4,4,2,0,'Use two output messages','say[\\s\\S]*say',6),
(8,'Level 7','Strings and Template Literals','Loop Labels','Build a different message for each loop iteration.','Use `Step ${i}`.','Use a loop and template literal to reach 5 tiles.',75,5,5,1,0,'Use a template literal in a loop','(for|while)[\\s\\S]*`',7),
(8,'Level 8','Strings and Template Literals','Condition Message','Choose a message using if-else.','Display a result from each branch.','Use if-else, strings, and say().',80,3,3,1,0,'Use if-else','if[\\s\\S]*else',8),
(8,'Level 9','Strings and Template Literals','Quest Log','Create a compact route log with variables and output.','Use a name, counter, and formatted output.','Use a loop, template literal, say(), and reach 7 tiles.',90,7,7,1,0,'Use a template literal','`',9),
(8,'Level 10','Strings and Template Literals','JavaScript Grand Quest','Use every core skill in a readable final program.','Name values, loop, decide, format output, and guide Pip.','Use variables, a loop, if, a template literal, say(), and reach 12 tiles.',120,12,12,1,0,'Use a template literal','`',10);
