const island3Lessons = [
  {
    id: 1,
    moduleId: 3,
    module_id: 3,
    level_label: 'Level 1',
    title: 'Numeric Storage',
    briefing: 'To bridge the ancient chasms of the Sunken Ruins, Pip must store exact measurements in memory. Numerical variables hold raw digits without quotes—perfect for tracking distances, tile counts, and health values.',
    question: 'Count the grid tiles between Pip and the waypoint. How can Pip cross this exact distance in a single line of code?',
    options: [
      'moveRight(3);', 'moveRight("3");', 'moveRight(three);', 'moveRight();'
    ],
    correctIndex: 0,
    guided: [
      {
        briefing: 'Pip must count the tiles between the ruins and the waypoint. Use the exact numeric distance without quotes so one movement command carries him across the chasm.',
        question: 'Count the grid tiles between Pip and the waypoint. How can Pip cross this exact distance in a single line of code?',
        prompt: 'Count the grid tiles between Pip and the waypoint. How can Pip cross this exact distance in a single line of code?',
        options: [
          'moveRight(3);', 'moveRight("3");', 'moveRight(three);', 'moveRight();'
        ],
        correctIndex: 0,
        correct_snippet: 'moveRight(3);'
      }
    ],
    steps: [
      {
        briefing: 'Pip must count the tiles between the ruins and the waypoint. Use the exact numeric distance without quotes so one movement command carries him across the chasm.',
        question: 'Count the grid tiles between Pip and the waypoint. How can Pip cross this exact distance in a single line of code?',
        prompt: 'Count the grid tiles between Pip and the waypoint. How can Pip cross this exact distance in a single line of code?',
        options: [
          'moveRight(3);', 'moveRight("3");', 'moveRight(three);', 'moveRight();'
        ],
        correctIndex: 0,
        correct_snippet: 'moveRight(3);'
      }
    ]
  },
  {
    id: 2,
    moduleId: 3,
    module_id: 3,
    level_label: 'Level 2',
    title: 'String Storage',
    briefing: 'An enchanted stone gate blocks the waterfall pass! To speak the ancient words of passage, Pip must wrap text characters inside double quotes ("..."). Strings store words, phrases, and magical incantations.',
    question: 'Pip needs to state the magic password to lower the barrier. Declare a String variable named gateKey with the value "OPEN".',
    options: [
      'String gateKey = "OPEN";', 'String gateKey = OPEN;', 'gateKey = "OPEN"', 'int gateKey = "OPEN";'
    ],
    correctIndex: 0,
    guided: [
      {
        briefing: 'Pip needs to state the magic password before the waterfall gate lowers. Declare a String named gateKey and wrap OPEN in double quotes so the gate receives text.',
        question: 'Pip needs to state the magic password to lower the barrier. Declare a String variable named gateKey with the value "OPEN".',
        prompt: 'Pip needs to state the magic password to lower the barrier. Declare a String variable named gateKey with the value "OPEN".',
        options: [
          'String gateKey = "OPEN";', 'String gateKey = OPEN;', 'gateKey = "OPEN"', 'int gateKey = "OPEN";'
        ],
        correctIndex: 0,
        correct_snippet: 'String gateKey = "OPEN";'
      }
    ],
    steps: [
      {
        briefing: 'Pip must encode the full password and its one-character crest separately. Declare a String named password for the words and a char named crest for the single rune before translating the sign.',
        question: 'How should Pip declare variables for single characters and full text strings?',
        prompt: 'How should Pip declare variables for single characters and full text strings?',
        options: [
          'String password = "OpenSesame"; char crest = \'A\';',
          'char password = "OpenSesame"; String crest = \'A\';',
          'String password = \'OpenSesame\'; char crest = "A";',
          'string password = "OpenSesame"; Char crest = \'A\';'
        ],
        correctIndex: 0,
        correct_snippet: 'String password = "OpenSesame"; char crest = \'A\';'
      }
    ]
  },
  {
    id: 3,
    moduleId: 3,
    module_id: 3,
    level_label: 'Level 3',
    title: 'Boolean Gate',
    briefing: 'The sky bridge runs on crystal switches that can only exist in two states: charged or uncharged. Boolean variables hold either true or false to evaluate logical pathways before Pip steps forward.',
    question: 'Create a boolean variable named isBridgeActive and set it to true so Pip can cross safely.',
    options: [
      'boolean isBridgeActive = true;', 'boolean isBridgeActive = "true";', 'bool isBridgeActive = 1;', 'isBridgeActive = true;'
    ],
    correctIndex: 0,
    guided: [
      {
        briefing: 'Pip needs a crystal switch with a true-or-false state. Declare boolean isBridgeActive and set it to true so the sky bridge powers on for his crossing.',
        question: 'Create a boolean variable named isBridgeActive and set it to true so Pip can cross safely.',
        prompt: 'Create a boolean variable named isBridgeActive and set it to true so Pip can cross safely.',
        options: [
          'boolean isBridgeActive = true;', 'boolean isBridgeActive = "true";', 'bool isBridgeActive = 1;', 'isBridgeActive = true;'
        ],
        correctIndex: 0,
        correct_snippet: 'boolean isBridgeActive = true;'
      }
    ],
    steps: [
      {
        briefing: 'Pip needs a true-or-false value for the bridge shield. Declare a boolean named isShieldActive and set it to false so the protective aura powers down for his crossing.',
        question: 'Which code snippet correctly sets the shield status to false using a boolean variable?',
        prompt: 'Which code snippet correctly sets the shield status to false using a boolean variable?',
        options: [
          'boolean isShieldActive = false;',
          'Boolean isShieldActive = "false";',
          'bool isShieldActive = 0;',
          'boolean isShieldActive = \'false\';'
        ],
        correctIndex: 0,
        correct_snippet: 'boolean isShieldActive = false;'
      }
    ]
  },
  {
    id: 4,
    moduleId: 3,
    module_id: 3,
    level_label: 'Level 4',
    title: 'Addition Boost',
    briefing: 'Heavy stone lifts require precise weight calculations to ascend the mountain fortress. Use standard operators (+, -, *, /) to combine numeric variables and compute Pip\'s movement totals dynamically.',
    question: 'Pip needs to jump across two separate gaps of 2 tiles and 3 tiles. Calculate the total tiles using addition and store it in an integer named totalDistance.',
    options: ['int totalDistance = 2 + 3;', 'int totalDistance = "2 + 3";', 'totalDistance = 2 + 3', 'String totalDistance = 2 + 3;'],
    correctIndex: 0,
    guided: [
      {
        briefing: 'Pip must combine the two gap lengths before jumping. Add 2 and 3 as numeric values, then store the result in the integer totalDistance so the lift knows the full route.',
        question: 'Pip needs to jump across two separate gaps of 2 tiles and 3 tiles. Calculate the total tiles using addition and store it in an integer named totalDistance.',
        prompt: 'Pip needs to jump across two separate gaps of 2 tiles and 3 tiles. Calculate the total tiles using addition and store it in an integer named totalDistance.',
        options: ['int totalDistance = 2 + 3;', 'int totalDistance = "2 + 3";', 'totalDistance = 2 + 3', 'String totalDistance = 2 + 3;'],
        correctIndex: 0,
        correct_snippet: 'int totalDistance = 2 + 3;'
      }
    ],
    steps: [
      {
        briefing: 'Pip must combine the two gap lengths before jumping. Add 2 and 3 as numeric values, then store the result in the integer totalDistance so the lift knows the full route.',
        question: 'Pip needs to jump across two separate gaps of 2 tiles and 3 tiles. Calculate the total tiles using addition and store it in an integer named totalDistance.',
        prompt: 'Pip needs to jump across two separate gaps of 2 tiles and 3 tiles. Calculate the total tiles using addition and store it in an integer named totalDistance.',
        options: ['int totalDistance = 2 + 3;', 'int totalDistance = "2 + 3";', 'totalDistance = 2 + 3', 'String totalDistance = 2 + 3;'],
        correctIndex: 0,
        correct_snippet: 'int totalDistance = 2 + 3;'
      }
    ]
  },
  {
    id: 5,
    moduleId: 3,
    module_id: 3,
    level_label: 'Level 5',
    title: 'Multiply Distance',
    briefing: 'Dodging the pendulum traps along the castle wall requires updating Pip\'s speed mid-flight. Reassigning a variable updates its stored value, allowing Pip to adapt to changing terrain without creating new variables.',
    question: 'Pip\'s speed is initially set to 2. Reassign the existing speed variable to 5 to sprint past the falling rocks.',
    options: [
      'speed = 5;', 'int speed = 5;', 'speed == 5;', 'String speed = "5";'
    ],
    correctIndex: 0,
    guided: [
      {
        briefing: 'Pip\'s speed is already stored as 2. Reassign the existing variable to 5 so he can sprint past the falling rocks without declaring a new speed variable.',
        question: 'Pip\'s speed is initially set to 2. Reassign the existing speed variable to 5 to sprint past the falling rocks.',
        prompt: 'Pip\'s speed is initially set to 2. Reassign the existing speed variable to 5 to sprint past the falling rocks.',
        options: [
          'speed = 5;', 'int speed = 5;', 'speed == 5;', 'String speed = "5";'
        ],
        correctIndex: 0,
        correct_snippet: 'speed = 5;'
      }
    ],
    steps: [
      {
        briefing: 'Pip needs to calculate his longer leap before moving. Store the base jump in baseJump, multiply it by 3, and store the result in upgradedJump so the grid knows how far he can travel.',
        question: 'Which expression calculates Pip\'s upgraded jump distance correctly?',
        prompt: 'Which expression calculates Pip\'s upgraded jump distance correctly?',
        options: ['speed = 5;', 'int speed = 5;', 'speed == 5;', 'String speed = "5";'],
        correctIndex: 0,
        correct_snippet: 'int baseJump = 4; int upgradedJump = baseJump * 3;'
      }
    ]
  },
  {
    id: 6,
    moduleId: 3,
    module_id: 3,
    level_label: 'Level 6',
    title: 'Remainder Check',
    briefing: 'Some laws of the realm are unchangeable! The gravity constant of the ruins must remain fixed. Learn how to declare immutable constants using final to prevent accidental changes during Pip\'s journey.',
    question: 'Declare a constant integer named MAX_ENERGY set to 100 that cannot be altered later.',
    options: ['final int MAX_ENERGY = 100;', 'const int MAX_ENERGY = 100;', 'int final MAX_ENERGY = 100;', 'final MAX_ENERGY = 100;'],
    correctIndex: 0,
    guided: [
      {
        briefing: 'Pip needs an immutable energy reserve. Declare final int MAX_ENERGY with the value 100 so the gravity constant cannot change during the journey.',
        question: 'Declare a constant integer named MAX_ENERGY set to 100 that cannot be altered later.',
        prompt: 'Declare a constant integer named MAX_ENERGY set to 100 that cannot be altered later.',
        options: ['final int MAX_ENERGY = 100;', 'const int MAX_ENERGY = 100;', 'int final MAX_ENERGY = 100;', 'final MAX_ENERGY = 100;'],
        correctIndex: 0,
        correct_snippet: 'final int MAX_ENERGY = 100;'
      }
    ],
    steps: [
      {
        briefing: 'Pip needs the remainder left after dividing step by 2. Store step as 7, calculate step % 2, and use that remainder to identify which trap pattern Pip is standing on.',
        question: 'What does step % 2 evaluate to when Pip is on tile step 7?\n\nint step = 7;\nint remainder = step % 2;',
        prompt: 'What does step % 2 evaluate to when Pip is on tile step 7?\n\nint step = 7;\nint remainder = step % 2;',
        options: ['1', '3.5', '0', '3'],
        correctIndex: 0,
        correct_snippet: '1'
      }
    ]
  },
  {
    id: 7,
    moduleId: 3,
    module_id: 3,
    level_label: 'Level 7',
    title: 'Assignment Upgrade',
    briefing: 'The runic pedestal requires combining Pip\'s hero title with the spell password. Join multiple strings together using the + operator to forge complete commands.',
    question: 'Combine "Hello " and "Pip" using string concatenation and store the result in a String variable named greeting.',
    options: ['String greeting = "Hello " + "Pip";', 'String greeting = "Hello " . "Pip";', 'String greeting = "Hello " && "Pip";', 'greeting = "Hello " + "Pip"'],
    correctIndex: 0,
    guided: [
      {
        briefing: 'Pip needs to forge one greeting from two text fragments. Join the title and name with +, then store the complete command in the String greeting.',
        question: 'Combine "Hello " and "Pip" using string concatenation and store the result in a String variable named greeting.',
        prompt: 'Combine "Hello " and "Pip" using string concatenation and store the result in a String variable named greeting.',
        options: ['String greeting = "Hello " + "Pip";', 'String greeting = "Hello " . "Pip";', 'String greeting = "Hello " && "Pip";', 'greeting = "Hello " + "Pip"'],
        correctIndex: 0,
        correct_snippet: 'String greeting = "Hello " + "Pip";'
      }
    ],
    steps: [
      {
        briefing: 'Pip starts with 100 health, loses 20 to the sentinel, and regains 15 from the potion. Apply each compound assignment in order to calculate the health value that lets him continue.',
        question: 'What is Pip\'s final health after running this condensed arithmetic block?\n\nint health = 100;\nhealth -= 20;\nhealth += 15;',
        prompt: 'What is Pip\'s final health after running this condensed arithmetic block?\n\nint health = 100;\nhealth -= 20;\nhealth += 15;',
        options: ['95', '115', '80', '100'],
        correctIndex: 0,
        correct_snippet: '95'
      }
    ]
  },
  {
    id: 8,
    moduleId: 3,
    module_id: 3,
    level_label: 'Level 8',
    title: 'Comparison Scout',
    briefing: 'The ancient altar only reads text inputs, but Pip\'s map coordinates are stored as numbers! Cast numeric values into strings to forge valid key codes.',
    question: 'Convert the integer distance = 10 to a String named strDistance using String.valueOf().',
    options: ['String strDistance = String.valueOf(distance);', 'String strDistance = (String) distance;', 'String strDistance = distance.toString();', 'int strDistance = String(distance);'],
    correctIndex: 0,
    guided: [
      {
        briefing: 'Pip must turn the numeric map distance into text for the altar. Use String.valueOf(distance) and store that text in strDistance so the key code can be read.',
        question: 'Convert the integer distance = 10 to a String named strDistance using String.valueOf().',
        prompt: 'Convert the integer distance = 10 to a String named strDistance using String.valueOf().',
        options: [
          'String strDistance = String.valueOf(distance);', 'String strDistance = (String) distance;', 'String strDistance = distance.toString();', 'int strDistance = String(distance);'
        ],
        correctIndex: 0,
        correct_snippet: 'String strDistance = String.valueOf(distance);'
      }
    ],
    steps: [
      {
        briefing: 'Pip has 4 keys and 0 warnings. Compare both facts with &&: the door opens only when he has at least 3 keys and the warning count is exactly zero.',
        question: 'Which condition evaluates to true when keys = 4 and warnings = 0?',
        prompt: 'Which condition evaluates to true when keys = 4 and warnings = 0?',
        options: [
          '(keys >= 3) && (warnings == 0)',
          '(keys > 4) || (warnings != 0)',
          '(keys == 3) && (warnings == 0)',
          '(keys < 3) && (warnings == 0)'
        ],
        correctIndex: 0,
        correct_snippet: '(keys >= 3) && (warnings == 0)'
      }
    ]
  },
  {
    id: 9,
    moduleId: 3,
    module_id: 3,
    level_label: 'Level 9',
    title: 'Expression Mission',
    briefing: 'Spike traps deactivate only when Pip\'s energy level matches or exceeds the threshold. Use comparison operators (>, <, ==, >=) to test conditions in real-time.',
    question: 'Check if Pip\'s energy variable (value 50) is greater than or equal to 30. Store the boolean result in canPass.',
    options: ['boolean canPass = energy >= 30;', 'boolean canPass = energy => 30;', 'boolean canPass = energy = 30;', 'canPass = energy >== 30;'],
    correctIndex: 0,
    guided: [
      {
        briefing: 'Pip must compare energy with the trap threshold before stepping forward. Store the true-or-false result in canPass using >= so energy 50 qualifies against 30.',
        question: 'Check if Pip\'s energy variable (value 50) is greater than or equal to 30. Store the boolean result in canPass.',
        prompt: 'Check if Pip\'s energy variable (value 50) is greater than or equal to 30. Store the boolean result in canPass.',
        options: ['boolean canPass = energy >= 30;', 'boolean canPass = energy => 30;', 'boolean canPass = energy = 30;', 'canPass = energy >== 30;'],
        correctIndex: 0,
        correct_snippet: 'boolean canPass = energy >= 30;'
      }
    ],
    steps: [
      {
        briefing: 'Pip must predict the energy before the lock moves. Read int energy = 2 + 3 * 4 using Java order of operations: multiply first, then add the result to 2.',
        question: 'What total energy value does the door mechanism calculate?\n\nint energy = 2 + 3 * 4;',
        prompt: 'What total energy value does the door mechanism calculate?\n\nint energy = 2 + 3 * 4;',
        options: ['14', '20', '24', '9'],
        correctIndex: 0,
        correct_snippet: '14'
      }
    ]
  },
  {
    id: 10,
    moduleId: 3,
    module_id: 3,
    level_label: 'Level 10',
    title: 'Operator Arena',
    briefing: 'You\'ve reached the heart of Island 3! Combine strings, numbers, booleans, and math logic to unlock the grand vault door and secure the ancient rune stone.',
    question: 'Declare a final integer VAULT_CODE set to 99, a String userTitle set to "Master", and verify isUnlocked is true to clear the final puzzle.',
    options: [
      'final int VAULT_CODE = 99; String userTitle = "Master"; boolean isUnlocked = true;',
      'int VAULT_CODE = 99; userTitle = "Master"; isUnlocked = "true";',
      'final int VAULT_CODE = "99"; String userTitle = Master; boolean isUnlocked = 1;'
    ],
    correctIndex: 0,
    guided: [
      {
        briefing: 'Pip must combine every skill at the vault. Declare the final code and title, then set isUnlocked to true so the grand door verifies the complete solution.',
        question: 'Declare a final integer VAULT_CODE set to 99, a String userTitle set to "Master", and verify isUnlocked is true to clear the final puzzle.',
        prompt: 'Declare a final integer VAULT_CODE set to 99, a String userTitle set to "Master", and verify isUnlocked is true to clear the final puzzle.',
        options: ['final int VAULT_CODE = 99; String userTitle = "Master"; boolean isUnlocked = true;', 'int VAULT_CODE = 99; userTitle = "Master"; isUnlocked = "true";', 'final int VAULT_CODE = "99"; String userTitle = Master; boolean isUnlocked = 1;'],
        correctIndex: 0,
        correct_snippet: 'final int VAULT_CODE = 99; String userTitle = "Master"; boolean isUnlocked = true;'
      }
    ],
    steps: [
      {
        briefing: 'Pip must prepare two values before casting. Subtract 20 from mana, add 20 to health, then use && to verify mana is at least 30 and health is exactly 100 before the boss gate opens.',
        question: 'What is the value of canCast after executing the preparation sequence?\n\nint mana = 50;\nint health = 80;\nmana -= 20;\nhealth += 20;\nboolean canCast = (mana >= 30) && (health == 100);',
        prompt: 'What is the value of canCast after executing the preparation sequence?\n\nint mana = 50;\nint health = 80;\nmana -= 20;\nhealth += 20;\nboolean canCast = (mana >= 30) && (health == 100);',
        options: ['true', 'false', 'null', 'Syntax Error'],
        correctIndex: 0,
        correct_snippet: 'true'
      }
    ]
  }
]

export default island3Lessons
