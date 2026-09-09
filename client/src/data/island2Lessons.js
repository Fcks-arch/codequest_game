const island2Lessons = [
  {
    id: 11,
    module_id: 2,
    level_label: 'Level 11',
    title: 'Plan the Route',
    briefing: 'In Java, an algorithm is a clear sequence of typed method calls. Each statement ends with a semicolon and runs from top to bottom.',
    question: 'Which Java statement sends a starting message from Pip?',
    options: ['say("Start");', 'Say("Start");', 'say(Start);', 'System.out.println("Start");'],
    correctIndex: 0,
    steps: [
      {
        question: 'Which Java statement sends a starting message from Pip?',
        options: ['say("Start");', 'Say("Start");', 'say(Start);', 'System.out.println("Start");'],
        correctIndex: 0
      },
      {
        question: 'Which Java method call moves Pip three tiles?',
        options: ['moveRight(3);', 'moveRight("3");', 'moveright(3);', 'moveRight();'],
        correctIndex: 0
      },
      {
        question: 'Which Java statement makes Pip jump after moving?',
        options: ['jump(1);', 'Jump(1);', 'jump("1");', 'jump(1, 0);'],
        correctIndex: 0
      }
    ]
  },
  {
    id: 12,
    module_id: 2,
    level_label: 'Level 12',
    title: 'Order Matters',
    briefing: 'Java executes statements in the order they appear. A readable algorithm places the movement method call before the final message.',
    question: 'Which Java statement moves Pip before the completion message?',
    options: ['moveRight(3);', 'moveRight("3");', 'MoveRight(3);', 'moveRight();'],
    correctIndex: 0,
    steps: [
      {
        question: 'Which Java statement moves Pip before the completion message?',
        options: ['moveRight(3);', 'moveRight("3");', 'MoveRight(3);', 'moveRight();'],
        correctIndex: 0
      },
      {
        question: 'Which Java statement outputs a completion message?',
        options: ['say("Arrived");', 'say(Arrived);', 'Say("Arrived");', 'System.print("Arrived");'],
        correctIndex: 0
      },
      {
        question: 'Which Java statement should complete the route after the movement?',
        options: ['say("Arrived");', 'moveRight(3);', 'say(Arrived);', 'Say("Arrived");'],
        correctIndex: 0
      }
    ]
  },
  {
    id: 13,
    module_id: 2,
    level_label: 'Level 13',
    title: 'Trace the Value',
    briefing: 'In Java, declare an integer with its type before using it as a method parameter. The variable name is case-sensitive.',
    question: 'Which Java statement declares an integer distance?',
    options: ['int distance = 4;', 'distance = 4;', 'Integer distance = "4";', 'int Distance = 4;'],
    correctIndex: 0,
    steps: [
      {
        question: 'Which Java statement declares an integer distance?',
        options: ['int distance = 4;', 'distance = 4;', 'Integer distance = "4";', 'int Distance = 4;'],
        correctIndex: 0
      },
      {
        question: 'Which Java call uses the declared variable as a parameter?',
        options: ['moveRight(distance);', 'moveRight(Distance);', 'moveRight("distance");', 'MoveRight(distance);'],
        correctIndex: 0
      },
      {
        question: 'Which Java statement uses the declared distance while keeping it in scope?',
        options: ['moveRight(distance);', 'moveRight(Distance);', 'moveRight("distance");', 'MoveRight(distance);'],
        correctIndex: 0
      }
    ]
  },
  {
    id: 14,
    module_id: 2,
    level_label: 'Level 14',
    title: 'Checkpoint Recipe',
    briefing: 'A Java algorithm can combine several typed method calls into a predictable route. Keep each call on its own semicolon-terminated line.',
    question: 'Which Java call completes the first movement stage?',
    options: ['moveRight(2);', 'moveRight("2");', 'MoveRight(2);', 'moveRight();'],
    correctIndex: 0,
    steps: [
      {
        question: 'Which Java call completes the first movement stage?',
        options: ['moveRight(2);', 'moveRight("2");', 'MoveRight(2);', 'moveRight();'],
        correctIndex: 0
      },
      {
        question: 'Which Java call clears the checkpoint gap?',
        options: ['jump(1);', 'jump("1");', 'Jump(1);', 'jump(1, 1);'],
        correctIndex: 0
      },
      {
        question: 'Which Java call completes the second movement stage?',
        options: ['moveRight(3);', 'moveRight("3");', 'moveright(3);', 'moveRight(3.0);'],
        correctIndex: 0
      }
    ]
  },
  {
    id: 15,
    module_id: 2,
    level_label: 'Level 15',
    title: 'Calculated Plan',
    briefing: 'Java evaluates an integer expression before passing its result to a method. Declare typed values before using arithmetic with them.',
    question: 'Which Java statement declares a typed base value?',
    options: ['int base = 3;', 'base = 3;', 'var base = 3;', 'Integer base = "3";'],
    correctIndex: 0,
    steps: [
      {
        question: 'Which Java statement declares a typed base value?',
        options: ['int base = 3;', 'base = 3;', 'var base = 3;', 'Integer base = "3";'],
        correctIndex: 0
      },
      {
        question: 'Which Java statement stores the multiplied result in a typed variable?',
        options: ['int calculated = base * 2;', 'int calculated = base * "2";', 'int Calculated = Base * 2;', 'int calculated == base * 2;'],
        correctIndex: 0
      },
      {
        question: 'Which Java call uses the calculated expression?',
        options: ['moveRight(base * 2);', 'moveRight(base * "2");', 'MoveRight(base * 2);', 'moveRight(base, 2);'],
        correctIndex: 0
      }
    ]
  },
  {
    id: 16,
    module_id: 2,
    level_label: 'Level 16',
    title: 'Message Trail',
    briefing: 'Java String values can document algorithm checkpoints. Declare each String before passing it to the output method.',
    question: 'Which Java statement declares the starting checkpoint text?',
    options: ['String start = "Start";', 'string start = "Start";', 'String start = Start;', 'start = "Start";'],
    correctIndex: 0,
    steps: [
      {
        question: 'Which Java statement declares the starting checkpoint text?',
        options: ['String start = "Start";', 'string start = "Start";', 'String start = Start;', 'start = "Start";'],
        correctIndex: 0
      },
      {
        question: 'Which Java statement displays a String variable?',
        options: ['say(start);', 'say(Start);', 'Say(start);', 'say("start");'],
        correctIndex: 0
      },
      {
        question: 'Which Java statement declares the finish checkpoint text?',
        options: ['String finish = "Finish";', 'String finish = Finish;', 'string finish = "Finish";', 'finish = "Finish";'],
        correctIndex: 0
      }
    ]
  },
  {
    id: 17,
    module_id: 2,
    level_label: 'Level 17',
    title: 'Stepwise Refinement',
    briefing: 'Java variables make an algorithm easier to refine. Declare an int step value, then reuse it in a movement method call.',
    question: 'Which Java statement declares the reusable step size?',
    options: ['int step = 2;', 'step = 2;', 'var step = 2;', 'int Step = 2;'],
    correctIndex: 0,
    steps: [
      {
        question: 'Which Java statement declares the reusable step size?',
        options: ['int step = 2;', 'step = 2;', 'var step = 2;', 'int Step = 2;'],
        correctIndex: 0
      },
      {
        question: 'Which Java call reuses the step variable?',
        options: ['moveRight(step);', 'moveRight(Step);', 'moveRight("step");', 'MoveRight(step);'],
        correctIndex: 0
      },
      {
        question: 'Which Java statement reuses the typed step while keeping it in scope?',
        options: ['moveRight(step);', 'moveRight(Step);', 'moveRight("step");', 'MoveRight(step);'],
        correctIndex: 0
      }
    ]
  },
  {
    id: 18,
    module_id: 2,
    level_label: 'Level 18',
    title: 'Logic Relay',
    briefing: 'Java can calculate a method argument from multiple integer variables. Declare both operands as int values before adding them.',
    question: 'Which Java statement declares the first integer operand?',
    options: ['int speed = 3;', 'speed = 3;', 'var speed = 3;', 'int Speed = "3";'],
    correctIndex: 0,
    steps: [
      {
        question: 'Which Java statement declares the first integer operand?',
        options: ['int speed = 3;', 'speed = 3;', 'var speed = 3;', 'int Speed = "3";'],
        correctIndex: 0
      },
      {
        question: 'Which Java statement declares the second integer operand?',
        options: ['int bonus = 4;', 'bonus = 4;', 'int bonus = "4";', 'Integer bonus = 4;'],
        correctIndex: 0
      },
      {
        question: 'Which Java call adds both integer variables before moving?',
        options: ['moveRight(speed + bonus);', 'moveRight(speed + Bonus);', 'moveRight("speed + bonus");', 'MoveRight(speed + bonus);'],
        correctIndex: 0
      }
    ]
  },
  {
    id: 19,
    module_id: 2,
    level_label: 'Level 19',
    title: 'Route Debug',
    briefing: 'A Java algorithm is easier to debug when String checkpoint messages surround each movement method call.',
    question: 'Which Java statement declares a checkpoint message?',
    options: ['String checkpoint = "Checkpoint";', 'string checkpoint = "Checkpoint";', 'String checkpoint = Checkpoint;', 'checkpoint = "Checkpoint";'],
    correctIndex: 0,
    steps: [
      {
        question: 'Which Java statement declares a checkpoint message?',
        options: ['String checkpoint = "Checkpoint";', 'string checkpoint = "Checkpoint";', 'String checkpoint = Checkpoint;', 'checkpoint = "Checkpoint";'],
        correctIndex: 0
      },
      {
        question: 'Which Java sequence reports before the first movement?',
        options: ['say(checkpoint);\nmoveRight(3);', 'say(Checkpoint);\nmoveRight(3);', 'Say(checkpoint);\nmoveRight(3);', 'say(checkpoint);\nmoveRight("3");'],
        correctIndex: 0
      },
      {
        question: 'Which Java sequence reports again before the second movement?',
        options: ['say(checkpoint);\nmoveRight(3);', 'say(Checkpoint);\nmoveRight(3);', 'say(checkpoint);\nMoveRight(3);', 'say(checkpoint);\nmoveRight();'],
        correctIndex: 0
      }
    ]
  },
  {
    id: 20,
    module_id: 2,
    level_label: 'Level 20',
    title: 'Logic Mastery',
    briefing: 'A complete Java algorithm combines typed variables, String output, method calls, and a predictable sequence of statements.',
    question: 'Which Java statement declares the travel distance?',
    options: ['int distance = 9;', 'distance = 9;', 'var distance = 9;', 'int distance = "9";'],
    correctIndex: 0,
    steps: [
      {
        question: 'Which Java statement declares the travel distance?',
        options: ['int distance = 9;', 'distance = 9;', 'var distance = 9;', 'int distance = "9";'],
        correctIndex: 0
      },
      {
        question: 'Which Java statement declares typed status text?',
        options: ['String status = "Ready";', 'string status = "Ready";', 'String status = Ready;', 'status = "Ready";'],
        correctIndex: 0
      },
      {
        question: 'Which Java sequence uses the typed values and a jump?',
        options: ['say(status);\nmoveRight(distance);\njump(1);', 'say(Status);\nmoveRight(distance);\njump(1);', 'say(status);\nmoveRight("distance");\njump(1);', 'Say(status);\nmoveRight(distance);\nJump(1);'],
        correctIndex: 0
      }
    ]
  }
]

export default island2Lessons
