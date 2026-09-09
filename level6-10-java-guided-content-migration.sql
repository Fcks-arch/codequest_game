-- Java-native guided content for Island 1, Levels 6 through 10.
-- Safe to re-run: replaces only these lessons' guided steps.
USE codequest;

-- Island 3: Java data-type challenges
SET @level1_id = 1;
SET @level2_id = 2;
SET @level3_id = 3;
SET @level4_id = 4;
SET @level5_id = 5;
SET @level6_id = 6;
SET @level7_id = 7;
SET @level8_id = 8;
SET @level9_id = 9;
SET @level10_id = 10;

UPDATE lessons SET track = 'JAVA FOUNDATIONS',
  briefing = 'To bridge the ancient chasms of the Sunken Ruins, Pip must store exact measurements in memory. Numerical variables hold raw digits without quotes—perfect for tracking distances, tile counts, and health values.',
  hint = 'Use whole-number types for counts and floating-point types for fractional values.',
  goal = 'Declare numeric variables that correctly store coin counts and potion volumes.' WHERE id = @level1_id;
UPDATE lessons SET track = 'JAVA FOUNDATIONS',
  briefing = 'An enchanted stone gate blocks the waterfall pass! To speak the ancient words of passage, Pip must wrap text characters inside double quotes ("..."). Strings store words, phrases, and magical incantations.',
  hint = 'A char stores one character, while a String stores a full text value.',
  goal = 'Declare variables for one character and a text string.' WHERE id = @level2_id;
UPDATE lessons SET track = 'JAVA FOUNDATIONS',
  briefing = 'The sky bridge runs on crystal switches that can only exist in two states: charged or uncharged. Boolean variables hold either true or false to evaluate logical pathways before Pip steps forward.',
  hint = 'A boolean should hold either true or false, not a text value.',
  goal = 'Set a boolean variable to false for the shield status.' WHERE id = @level3_id;
UPDATE lessons SET track = 'JAVA FOUNDATIONS',
  briefing = 'Heavy stone lifts require precise weight calculations to ascend the mountain fortress. Use standard operators (+, -, *, /) to combine numeric variables and compute Pip''s movement totals dynamically.',
  hint = 'Add the current total to the new coin amount to find the updated balance.',
  goal = 'Calculate the final totalCoins value after the addition.' WHERE id = @level4_id;
UPDATE lessons SET track = 'JAVA FOUNDATIONS',
  briefing = 'Dodging the pendulum traps along the castle wall requires updating Pip''s speed mid-flight. Reassigning a variable updates its stored value, allowing Pip to adapt to changing terrain without creating new variables.',
  hint = 'Use the multiplication operator to scale a value by 3.',
  goal = 'Multiply the base jump distance to create the upgraded value.' WHERE id = @level5_id;
UPDATE lessons SET track = 'JAVA FOUNDATIONS',
  briefing = 'Some laws of the realm are unchangeable! The gravity constant of the ruins must remain fixed. Learn how to declare immutable constants using final to prevent accidental changes during Pip''s journey.',
  hint = 'A remainder of 1 means the value is odd, while 0 means it is even.',
  goal = 'Use the remainder operator to compute the parity of step 7.' WHERE id = @level6_id;
UPDATE lessons SET track = 'JAVA FOUNDATIONS',
  briefing = 'The runic pedestal requires combining Pip''s hero title with the spell password. Join multiple strings together using the + operator to forge complete commands.',
  hint = 'A compound assignment operator updates the current value in place.',
  goal = 'Apply subtraction and addition to reach the final health value.' WHERE id = @level7_id;
UPDATE lessons SET track = 'JAVA FOUNDATIONS',
  briefing = 'The ancient altar only reads text inputs, but Pip''s map coordinates are stored as numbers! Cast numeric values into strings to forge valid key codes.',
  hint = 'Compare the values to decide whether the condition is true or false.',
  goal = 'Evaluate a compound comparison using keys and warnings.' WHERE id = @level8_id;
UPDATE lessons SET track = 'JAVA FOUNDATIONS',
  briefing = 'Spike traps deactivate only when Pip''s energy level matches or exceeds the threshold. Use comparison operators (>, <, ==, >=) to test conditions in real-time.',
  hint = 'Java evaluates multiplication before addition unless parentheses change the order.',
  goal = 'Calculate the correct energy total from the arithmetic expression.' WHERE id = @level9_id;
UPDATE lessons SET track = 'JAVA FOUNDATIONS',
  briefing = 'You''ve reached the heart of Island 3! Combine strings, numbers, booleans, and math logic to unlock the grand vault door and secure the ancient rune stone.',
  hint = 'Update mana and health first, then compare both using a boolean condition.',
  goal = 'Determine whether canCast is true or false after the full sequence.' WHERE id = @level10_id;

DELETE FROM guided_steps WHERE lesson_id IN (@level1_id, @level2_id, @level3_id, @level4_id, @level5_id, @level6_id, @level7_id, @level8_id, @level9_id, @level10_id);

INSERT INTO guided_steps (lesson_id, step_order, prompt, correct_snippet, distractor_1, distractor_2, distractor_3) VALUES
(@level1_id, 1, 'Count the grid tiles between Pip and the waypoint. How can Pip cross this exact distance in a single line of code?', 'moveRight(3);', 'moveRight("3");', 'moveRight(three);', 'moveRight();'),
(@level2_id, 1, 'Pip needs to state the magic password to lower the barrier. Declare a String variable named gateKey with the value "OPEN".', 'String gateKey = "OPEN";', 'String gateKey = OPEN;', 'gateKey = "OPEN"', 'int gateKey = "OPEN";'),
(@level3_id, 1, 'Create a boolean variable named isBridgeActive and set it to true so Pip can cross safely.', 'boolean isBridgeActive = true;', 'boolean isBridgeActive = "true";', 'bool isBridgeActive = 1;', 'isBridgeActive = true;'),
(@level4_id, 1, 'Pip needs to jump across two separate gaps of 2 tiles and 3 tiles. Calculate the total tiles using addition and store it in an integer named totalDistance.', 'int totalDistance = 2 + 3;', 'int totalDistance = "2 + 3";', 'totalDistance = 2 + 3', 'String totalDistance = 2 + 3;'),
(@level5_id, 1, 'Pip\'s speed is initially set to 2. Reassign the existing speed variable to 5 to sprint past the falling rocks.', 'speed = 5;', 'int speed = 5;', 'speed == 5;', 'String speed = "5";'),
(@level6_id, 1, 'Declare a constant integer named MAX_ENERGY set to 100 that cannot be altered later.', 'final int MAX_ENERGY = 100;', 'const int MAX_ENERGY = 100;', 'int final MAX_ENERGY = 100;', 'final MAX_ENERGY = 100;'),
(@level7_id, 1, 'Combine "Hello " and "Pip" using string concatenation and store the result in a String variable named greeting.', 'String greeting = "Hello " + "Pip";', 'String greeting = "Hello " . "Pip";', 'String greeting = "Hello " && "Pip";', 'greeting = "Hello " + "Pip"'),
(@level8_id, 1, 'Convert the integer distance = 10 to a String named strDistance using String.valueOf().', 'String strDistance = String.valueOf(distance);', 'String strDistance = (String) distance;', 'String strDistance = distance.toString();', 'int strDistance = String(distance);'),
(@level9_id, 1, 'Check if Pip\'s energy variable (value 50) is greater than or equal to 30. Store the boolean result in canPass.', 'boolean canPass = energy >= 30;', 'boolean canPass = energy => 30;', 'boolean canPass = energy = 30;', 'canPass = energy >== 30;'),
(@level10_id, 1, 'Declare a final integer VAULT_CODE set to 99, a String userTitle set to "Master", and verify isUnlocked is true to clear the final puzzle.', 'final int VAULT_CODE = 99; String userTitle = "Master"; boolean isUnlocked = true;', 'int VAULT_CODE = 99; userTitle = "Master"; isUnlocked = "true";', 'final int VAULT_CODE = "99"; String userTitle = Master; boolean isUnlocked = 1;', NULL);
