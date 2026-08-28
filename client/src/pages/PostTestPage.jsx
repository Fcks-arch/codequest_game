import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import { useAuth } from '../context/AuthContext'
import { C, Ico } from '../components/UI'

/* ══════════════════════════════════════════════════════════════
   POST-TEST / JAVA CODE CHALLENGE
   Strictly based on IT 102A — Fundamentals of Programming Syllabus
   ISPSC Tagudin Campus

   8 Topics × 5 real Java code-snippet questions = 40 total questions.
   Every question uses actual compilable-style Java code (not the
   Pip movement mini-language) and asks the student to trace output,
   spot a bug, or reason about a real-world scenario — not just
   recall a definition. Questions are ordered so the whole test
   ramps up smoothly:

     Q1–16  Easy      (2 per topic)  — read a short snippet, trace it
     Q17–24 Medium     (1 per topic) — trace a slightly longer snippet
     Q25–32 Hard        (1 per topic) — spot a subtle bug / edge case
     Q33–40 Extreme      (1 per topic) — real-world scenario + reasoning
   ══════════════════════════════════════════════════════════════ */

const TOPICS = [
  { id: 1, key: 'intro_programming',      label: 'Introduction to Programming',       island: 1, color: '#6366F1', icon: '🗺️' },
  { id: 2, key: 'program_logic',          label: 'Program Logic Design',               island: 2, color: '#8B5CF6', icon: '📐' },
  { id: 3, key: 'intro_java',             label: 'Introduction to Java Programming',   island: 3, color: '#EC4899', icon: '☕' },
  { id: 4, key: 'input_output',           label: 'Basic Input/Output Statements',      island: 4, color: '#F59E0B', icon: '💬' },
  { id: 5, key: 'decision_structures',    label: 'Control Structures: Decision',       island: 5, color: '#10B981', icon: '🔀' },
  { id: 6, key: 'repetition_structures',  label: 'Control Structures: Repetition',     island: 6, color: '#3B82F6', icon: '🔁' },
  { id: 7, key: 'branching_structures',   label: 'Control Structures: Branching',      island: 7, color: '#EF4444', icon: '⛳' },
  { id: 8, key: 'java_strings',           label: 'Java Strings',                       island: 8, color: '#14B8A6', icon: '📝' },
]

const DIFFICULTY = {
  Easy:    { label: 'Easy',    color: '#22C55E', bg: '#E8FCEF', order: 1 },
  Medium:  { label: 'Medium',  color: '#F59E0B', bg: '#FFF6E5', order: 2 },
  Hard:    { label: 'Hard',    color: '#F97316', bg: '#FFF1E5', order: 3 },
  Extreme: { label: 'Extreme', color: '#DC2626', bg: '#FEECEC', order: 4 },
}

/* Each question: { id, topic, difficulty, question, a,b,c,d, answer, explanation }
   `question` may contain real Java code — rendered in a <pre> code block
   whenever it contains a line break, so snippets stay readable. */
const RAW = {
  Easy: [
    { topic: 1, question: 'A programmer writes the Java statement:\n\nint total = price * quantity;\n\nBefore the CPU can actually run this line, what must happen to it first?',
      a: 'The line must be printed to the console', b: 'The line must be translated into machine code by a compiler/interpreter', c: 'The line must be saved as a .txt file', d: 'The line must be redrawn as a flowchart',
      answer: 'b', explanation: 'Source code is human-readable text. It must be compiled (or interpreted) into machine code before the CPU can execute it.' },
    { topic: 1, question: 'Which statement correctly compares low-level and high-level programming languages?',
      a: 'Low-level languages (like Assembly) are closer to machine code; high-level languages (like Java) are closer to human language', b: 'High-level languages run directly on hardware with no translation needed', c: 'Low-level languages are always object-oriented', d: 'There is no real difference between the two',
      answer: 'a', explanation: 'Low-level languages map closely to hardware instructions, while high-level languages prioritize readability and are translated for the machine.' },
    { topic: 2, question: 'Trace this pseudocode:\n\nSET total TO 0\nFOR each item in {10, 20, 30}\n    total = total + item\nDISPLAY total\n\nWhat is displayed?',
      a: '10', b: '30', c: '60', d: 'Error',
      answer: 'c', explanation: '10 + 20 + 30 = 60. The loop accumulates every item into total before it is displayed.' },
    { topic: 2, question: 'In a standard flowchart, which shape represents a decision point (a yes/no or true/false branch)?',
      a: 'Rectangle', b: 'Oval', c: 'Diamond', d: 'Parallelogram',
      answer: 'c', explanation: 'The diamond shape represents a branching decision; rectangles are processes, ovals are start/end, parallelograms are input/output.' },
    { topic: 3, question: 'Which of the following is a valid Java variable declaration?',
      a: 'int 2ndValue = 5;', b: 'int second-value = 5;', c: 'int secondValue = 5;', d: 'integer secondValue = 5;',
      answer: 'c', explanation: 'Java identifiers cannot start with a digit or contain hyphens, and the primitive type keyword is "int", not "integer".' },
    { topic: 3, question: 'Which of these is a valid Java identifier?',
      a: 'class', b: '_score', c: '3rdPlace', d: 'my value',
      answer: 'b', explanation: '"class" is a reserved keyword, identifiers can\'t start with a digit, and spaces are not allowed in a single identifier.' },
    { topic: 4, question: 'Which class is commonly used in Java to read user input from the keyboard?',
      a: 'Reader', b: 'Scanner', c: 'InputStream', d: 'Console',
      answer: 'b', explanation: 'java.util.Scanner wraps System.in and provides convenient methods like nextInt() and nextLine().' },
    { topic: 4, question: 'What is the difference in output between System.out.print("Hi") and System.out.println("Hi")?',
      a: 'print() adds a new line after; println() does not', b: 'println() adds a new line after; print() does not', c: 'They behave identically', d: 'print() only works with numbers',
      answer: 'b', explanation: 'println() moves the cursor to a new line after printing; print() leaves the cursor on the same line.' },
    { topic: 5, question: 'What does this print?\n\nint x = 7;\nif (x > 5) {\n    System.out.println("Big");\n} else {\n    System.out.println("Small");\n}',
      a: 'Big', b: 'Small', c: 'Nothing', d: 'Error',
      answer: 'a', explanation: '7 > 5 is true, so the if-branch runs and prints "Big".' },
    { topic: 5, question: 'What does this print?\n\nint day = 3;\nswitch (day) {\n    case 1: System.out.println("Mon"); break;\n    case 2: System.out.println("Tue"); break;\n    case 3: System.out.println("Wed"); break;\n    default: System.out.println("?");\n}',
      a: 'Mon', b: 'Tue', c: 'Wed', d: '?',
      answer: 'c', explanation: 'day equals 3, which matches case 3, so "Wed" prints and break exits the switch.' },
    { topic: 6, question: 'What does this print?\n\nfor (int i = 1; i <= 3; i++) {\n    System.out.print(i + " ");\n}',
      a: '1 2 3', b: '0 1 2', c: '1 2 3 4', d: '3 2 1',
      answer: 'a', explanation: 'i starts at 1 and increments while i <= 3, printing 1, 2, then 3.' },
    { topic: 6, question: 'What does this print?\n\nint i = 0;\nwhile (i < 3) {\n    System.out.print(i);\n    i++;\n}',
      a: '012', b: '123', c: '0123', d: 'Infinite loop',
      answer: 'a', explanation: 'The loop prints 0, 1, 2 and stops once i becomes 3, since 3 < 3 is false.' },
    { topic: 7, question: 'What does this print?\n\nfor (int i = 1; i <= 5; i++) {\n    if (i == 3) break;\n    System.out.print(i + " ");\n}',
      a: '1 2', b: '1 2 3', c: '1 2 3 4 5', d: '3 4 5',
      answer: 'a', explanation: 'break immediately exits the loop once i equals 3, so only 1 and 2 were printed first.' },
    { topic: 7, question: 'What does this print?\n\nfor (int i = 1; i <= 5; i++) {\n    if (i == 3) continue;\n    System.out.print(i + " ");\n}',
      a: '1 2 4 5', b: '1 2 3', c: '1 2 4', d: '1 2 3 4 5',
      answer: 'a', explanation: 'continue skips only the print for i == 3 and moves on to the next iteration; the loop still runs to completion.' },
    { topic: 8, question: 'What does this print?\n\nString a = "Code";\nString b = "Quest";\nSystem.out.println(a + b);',
      a: 'Code Quest', b: 'CodeQuest', c: 'Code+Quest', d: 'Error',
      answer: 'b', explanation: 'The + operator concatenates strings directly with no added space.' },
    { topic: 8, question: 'What does "Hello".length() return?',
      a: '4', b: '5', c: '6', d: 'It causes an error',
      answer: 'b', explanation: '"Hello" has 5 characters: H, e, l, l, o.' },
  ],
  Medium: [
    { topic: 1, question: 'A student is asked to build a simple grading system. Put these Program Development Life Cycle phases in the correct order:\n(1) Design the algorithm\n(2) Test and debug\n(3) Analyze the problem requirements\n(4) Write the Java code\n(5) Deploy and maintain',
      a: '3, 1, 4, 2, 5', b: '1, 3, 2, 4, 5', c: '3, 4, 1, 2, 5', d: '5, 3, 1, 4, 2',
      answer: 'a', explanation: 'You must understand the problem (analyze) before designing a solution (algorithm), then code it, test it, and finally maintain it.' },
    { topic: 2, question: 'This pseudocode is supposed to count from 1 to 5, but has a bug:\n\nSET i TO 1\nWHILE i < 5\n    DISPLAY i\n    i = i + 1\n\nWhat does it actually display?',
      a: '1 2 3 4 5', b: '1 2 3 4', c: '1 2 3 4 5 6', d: 'Nothing',
      answer: 'b', explanation: 'The loop stops as soon as i is no longer less than 5, so it displays 1, 2, 3, 4 and stops before displaying 5.' },
    { topic: 3, question: 'What happens when this code is compiled?\n\nfinal int MAX_SCORE = 100;\nMAX_SCORE = 120;\nSystem.out.println(MAX_SCORE);',
      a: 'It prints 120', b: 'It prints 100', c: 'It fails to compile because a final variable cannot be reassigned', d: 'It prints 0',
      answer: 'c', explanation: 'The "final" keyword makes MAX_SCORE a constant; any attempt to reassign it is a compile-time error.' },
    { topic: 4, question: 'What does this print?\n\nSystem.out.printf("%.2f%n", 9.5);',
      a: '9.5', b: '9.50', c: '9.500', d: '10.00',
      answer: 'b', explanation: '%.2f formats the number to exactly two decimal places, producing 9.50.' },
    { topic: 5, question: 'What does this print?\n\nint a = 4, b = 9;\nif (a > 5) {\n    if (b > 5) System.out.println("Both big");\n    else System.out.println("Only a big");\n} else {\n    if (b > 5) System.out.println("Only b big");\n    else System.out.println("Neither big");\n}',
      a: 'Both big', b: 'Only a big', c: 'Only b big', d: 'Neither big',
      answer: 'c', explanation: 'a > 5 is false, so the outer else runs. Inside it, b > 5 is true, so "Only b big" prints.' },
    { topic: 6, question: 'What does this print?\n\nint x = 10;\ndo {\n    System.out.println(x);\n    x++;\n} while (x < 5);',
      a: 'Nothing is printed', b: '10 is printed once, because a do-while always runs its body at least one time before checking the condition', c: 'An infinite loop occurs', d: 'It prints 10, 11, 12, 13, 14',
      answer: 'b', explanation: 'A do-while checks its condition after the body runs, so the body executes once even though x < 5 is false from the start.' },
    { topic: 7, question: 'What value does this method return when called with {3, 7, 8, 10}?\n\npublic static int firstEven(int[] nums) {\n    for (int n : nums) {\n        if (n % 2 == 0) return n;\n    }\n    return -1;\n}',
      a: '3', b: '7', c: '8', d: '-1',
      answer: 'c', explanation: 'The loop checks 3 (odd), 7 (odd), then 8 (even) and returns immediately, so 10 is never checked.' },
    { topic: 8, question: 'What does this print?\n\nString name = "CodeQuest";\nSystem.out.println(name.substring(0, 4));',
      a: 'Code', b: 'Ques', c: 'CodeQ', d: 'Quest',
      answer: 'a', explanation: 'substring(0, 4) takes characters at index 0 up to (but not including) index 4: "Code".' },
  ],
  Hard: [
    { topic: 1, question: 'Consider two designs for the same task:\n\nDesign A: three separate functions — calculateTotal(), applyDiscount(), printReceipt() — that all operate on a shared array of prices.\n\nDesign B: a Car class with fields fuel and speed, and methods drive() and refuel() that operate only on that object\'s own data.\n\nWhich paradigm does each design represent?',
      a: 'Design A is Object-Oriented; Design B is Procedural', b: 'Design A is Procedural; Design B is Object-Oriented', c: 'Both are Object-Oriented', d: 'Both are Procedural',
      answer: 'b', explanation: 'Design A is a set of functions sharing external data (procedural). Design B bundles data and behavior into one object (object-oriented).' },
    { topic: 2, question: 'You need an algorithm that finds the LARGEST of three numbers a, b, c. Which pseudocode correctly handles every case?',
      a: 'IF a > b THEN largest = a ELSE largest = b', b: 'IF a > b AND a > c THEN largest = a ELSE IF b > c THEN largest = b ELSE largest = c', c: 'largest = a + b + c', d: 'IF a > b THEN largest = c',
      answer: 'b', explanation: 'Option (a) never checks c at all. Option (b) correctly compares all three values in a way that covers every ordering.' },
    { topic: 3, question: 'What is the output of this code?\n\nint a = 7;\ndouble b = 2;\nSystem.out.println(a / b);',
      a: '3', b: '3.0', c: '3.5', d: '3.5000001',
      answer: 'c', explanation: 'Because b is a double, Java performs floating-point division: 7 / 2.0 = 3.5.' },
    { topic: 4, question: 'A student writes:\n\nScanner sc = new Scanner(System.in);\nSystem.out.print("Enter age: ");\nint age = sc.nextInt();\nSystem.out.print("Enter name: ");\nString name = sc.nextLine();\nSystem.out.println(name);\n\nWhen run, the program prints an empty name instead of what the user typed. Why?',
      a: 'nextLine() is broken in Java', b: 'nextInt() leaves the leftover newline character in the input buffer, which nextLine() immediately consumes as an empty string', c: 'Scanner cannot read Strings after reading an int', d: 'The variable name was never initialized',
      answer: 'b', explanation: 'This is a classic Java Scanner gotcha: nextInt() does not consume the trailing "\\n", so the very next nextLine() call reads that leftover newline instead of waiting for new input.' },
    { topic: 5, question: 'A grading program uses:\n\nif (score >= 90) grade = "A";\nelse if (score >= 80) grade = "B";\nelse if (score >= 70) grade = "C";\nelse grade = "F";\n\nFor score = 80, what grade is assigned, and why doesn\'t it fall into the "F" branch?',
      a: 'F, because 80 is not >= 90', b: 'B, because else-if chains stop at the first true condition, and 80 >= 80 is true', c: 'C, because 80 is closer to 70', d: 'A compile error occurs because 80 matches two conditions',
      answer: 'b', explanation: 'An if / else-if chain evaluates top to bottom and stops at the first true condition — 80 >= 90 is false, but 80 >= 80 is true, so grade becomes "B".' },
    { topic: 6, question: 'How many total times does "Tick" get printed?\n\nfor (int i = 0; i < 3; i++) {\n    for (int j = 0; j < 2; j++) {\n        System.out.println("Tick");\n    }\n}',
      a: '2', b: '3', c: '5', d: '6',
      answer: 'd', explanation: 'The outer loop runs 3 times, and for each of those, the inner loop runs 2 times: 3 × 2 = 6.' },
    { topic: 7, question: 'What does this print?\n\nfor (int i = 0; i < 3; i++) {\n    for (int j = 0; j < 3; j++) {\n        if (j == 1) break;\n        System.out.print(i + "" + j + " ");\n    }\n}',
      a: '00 01 02 10 11 12 20 21 22', b: '00 10 20', c: '00 01 10 11 20 21', d: 'Nothing prints',
      answer: 'b', explanation: 'break only exits the inner loop it is written in. For each outer i, the inner loop prints once (j=0) and then breaks as soon as j reaches 1, giving "00 10 20".' },
    { topic: 8, question: 'What does this print, and why?\n\nString a = new String("java");\nString b = new String("java");\nSystem.out.println(a == b);\nSystem.out.println(a.equals(b));',
      a: 'true then true', b: 'false then true — == compares object references, while .equals() compares actual text content', c: 'true then false', d: 'false then false',
      answer: 'b', explanation: 'new String(...) creates two separate objects in memory, so == (reference comparison) is false, but .equals() compares the characters, which are identical, so it is true.' },
  ],
  Extreme: [
    { topic: 1, question: 'A campus canteen\'s ordering program has grown into one giant method that reads input, calculates prices, applies discounts, and prints receipts all at once. Every time a developer changes the discount logic, the receipt formatting breaks too, and nobody wrote down the original requirements. Which PDLC phase was most likely skipped or rushed, and what change would prevent this problem going forward?',
      a: 'Testing was skipped; the fix is to add more print statements', b: 'Analysis/Design was rushed; the fix is to break the program into smaller, well-defined functions or classes with single responsibilities', c: 'Maintenance was skipped; the fix is to rewrite everything in Assembly', d: 'Coding was skipped; the fix is to use a flowchart instead of Java',
      answer: 'b', explanation: 'Tangled, unpredictable code is a classic symptom of skipping proper analysis and design. Splitting responsibilities into focused functions/classes makes each part independently changeable and testable.' },
    { topic: 2, question: 'A grading algorithm is described as: "A student passes a subject if their average is at least 75. If they pass, check if their average is at least 90 to award High Honors; otherwise if at least 85, award Honors." For a student with an average of 87, what outcome should a correctly refined algorithm produce, and how many decision points does it minimally need?',
      a: 'The student fails; 1 decision point', b: 'The student passes with High Honors; 1 decision point', c: 'The student passes with Honors; 2 nested decision points (pass check, then honors-level check)', d: 'The student passes with no honors; 3 decision points',
      answer: 'c', explanation: '87 is above the 75 pass mark (decision 1), but below 90, so it does not reach High Honors; it is at least 85, so it qualifies for Honors (decision 2).' },
    { topic: 3, question: 'A junior developer wrote this snippet for a simple inventory tracker:\n\npublic class Inventory {\n    public static void main(String[] args) {\n        int stock = 10\n        final double PRICE = 25.50;\n        stock = stock - 3;\n        System.out.println("Remaining: " + stock);\n    }\n}\n\nThe code fails to compile. What is the error, and what real Java rule does it violate?',
      a: 'PRICE cannot be declared final', b: 'Missing semicolon after "int stock = 10" — every Java statement must end with a semicolon', c: 'stock cannot be reassigned because it was declared with int', d: 'main() must return a value',
      answer: 'b', explanation: 'Java requires a semicolon to terminate every statement. Without it, the compiler cannot tell where the statement ends and reports a syntax error.' },
    { topic: 4, question: 'A grade-input program reads a student\'s name and 3 quiz scores, then prints the average:\n\nScanner sc = new Scanner(System.in);\nSystem.out.print("Name: ");\nString name = sc.nextLine();\nint sum = 0;\nfor (int i = 0; i < 3; i++) {\n    System.out.print("Score " + (i + 1) + ": ");\n    sum += sc.nextInt();\n}\ndouble avg = sum / 3;\nSystem.out.println(name + "\'s average is " + avg);\n\nFor input scores 80, 85, 90, what does the printed average actually show, and why might that surprise the student?',
      a: '85.0, because sum/3 is calculated as double division', b: '85.0, because sum and 3 are both int, so integer division truncates the decimal before the result is stored in the double avg', c: '85.5, rounded automatically', d: 'A compile error occurs',
      answer: 'b', explanation: 'sum / 3 is computed using integer division first (255 / 3 = 85, dropping any remainder) and only afterward assigned to the double avg, so it shows 85.0 instead of a properly-rounded decimal average.' },
    { topic: 5, question: 'An online store\'s shipping rule is: "Free shipping if the order is at least ₱2000, OR if the customer is a VIP member and the order is at least ₱1000." This is coded as:\n\nboolean freeShipping = (total >= 2000) || (isVIP && total >= 1000);\n\nFor a non-VIP customer with total = 1500, what is the value of freeShipping, and which part of the condition determines it?',
      a: 'true, because total >= 2000 is satisfied', b: 'false, because neither (total >= 2000) nor (isVIP && total >= 1000) is true, since isVIP is false', c: 'true, because total >= 1000', d: 'A compile error occurs due to mixing || and &&',
      answer: 'b', explanation: 'total >= 2000 is false (1500 < 2000). isVIP is false, so the && side short-circuits to false too. Since both sides of || are false, freeShipping is false.' },
    { topic: 6, question: 'A savings tracker simulates monthly compound interest:\n\ndouble balance = 1000;\nint month = 0;\nwhile (balance < 1200) {\n    balance = balance * 1.02;\n    month++;\n}\nSystem.out.println("Reached goal in " + month + " months.");\n\nA classmate changes the condition to while (balance != 1200), expecting the same result, and the program hangs. What real bug did they introduce, and why?',
      a: 'Nothing changed; the program behaves the same', b: 'Comparing floating-point balance to an exact value with != can create an infinite loop, since balance may overshoot 1200 and never equal it exactly', c: 'while loops cannot use != with doubles at all, so it fails to compile', d: 'The loop now runs exactly one fewer time',
      answer: 'b', explanation: 'Because balance grows by multiplying (1.02 each time), it will very likely jump from a value just under 1200 to a value just over 1200, skipping the exact value 1200.0 entirely, so the loop never stops.' },
    { topic: 7, question: 'A search function scans 10,000 customer records for a target ID using a for loop with an if/break early-exit. A teammate removes the break statement, arguing "the loop still finds the right answer." Assuming the target exists exactly once, is the teammate correct about correctness, and what real-world cost does removing break introduce?',
      a: 'No, removing break changes the final answer', b: 'Yes, the final matched value found is still correct, but the loop keeps scanning all remaining records even after finding it, wasting time — a real performance cost for large datasets', c: 'The program will no longer compile without break', d: 'break is required for the loop to run at all',
      answer: 'b', explanation: 'The correctness is unaffected because the match is still found and stored, but without break the loop wastes CPU time scanning records it no longer needs to check — a real efficiency concern at scale.' },
    { topic: 8, question: 'A registration form stores full names as "Dela Cruz, Juan" (Lastname, Firstname). This code extracts the first name:\n\nString full = "Dela Cruz, Juan";\nint comma = full.indexOf(",");\nString firstName = full.substring(comma + 1).trim();\nSystem.out.println(firstName);\n\nWhat is printed, and what would happen if the input string had no comma at all?',
      a: '"Juan" is printed; if there is no comma, indexOf returns -1, so substring(0) silently returns the whole trimmed string instead of throwing an error — producing quietly wrong data', b: '"Dela Cruz" is printed; a missing comma always causes a crash', c: '"Juan" is printed; a missing comma always throws a StringIndexOutOfBoundsException', d: 'A compile error occurs',
      answer: 'a', explanation: 'indexOf(",") returns -1 when not found, so comma + 1 becomes 0, and substring(0) returns the entire string. No exception is thrown — the bug is silent, which is often more dangerous than a crash because it can go unnoticed.' },
  ],
}

/* Flatten in Easy → Medium → Hard → Extreme order and assign stable ids. */
const QUESTIONS = ['Easy', 'Medium', 'Hard', 'Extreme'].flatMap(tier =>
  RAW[tier].map((q, i) => ({ ...q, id: `${tier}-${i}`, difficulty: tier }))
)

/* ── scoring helpers ── */
function scoreByTopic(answers) {
  const scores = {}
  TOPICS.forEach(t => { scores[t.id] = { correct: 0, total: 0, topic: t } })
  QUESTIONS.forEach(q => {
    scores[q.topic].total++
    if (answers[q.id] === q.answer) scores[q.topic].correct++
  })
  return scores
}

function scoreByDifficulty(answers) {
  const scores = {}
  Object.keys(DIFFICULTY).forEach(d => { scores[d] = { correct: 0, total: 0 } })
  QUESTIONS.forEach(q => {
    scores[q.difficulty].total++
    if (answers[q.id] === q.answer) scores[q.difficulty].correct++
  })
  return scores
}

function getWeakTopics(scores) {
  return Object.values(scores).filter(s => s.correct / s.total < 0.5)
}

/* ══════════════════════════════════════════════════════════════
   COMPONENT
   ══════════════════════════════════════════════════════════════ */
export default function PostTestPage() {
  const navigate = useNavigate()
  const { user }  = useAuth()

  const [phase, setPhase]       = useState('intro') // intro | test | result
  const [current, setCurrent]   = useState(0)
  const [answers, setAnswers]   = useState({})
  const [selected, setSelected] = useState(null)
  const [topicScores, setTopicScores]           = useState(null)
  const [difficultyScores, setDifficultyScores] = useState(null)
  const [saving, setSaving]     = useState(false)

  const q         = QUESTIONS[current]
  const progress  = (current / QUESTIONS.length) * 100
  const topicInfo = TOPICS.find(t => t.id === q?.topic)
  const diffInfo  = DIFFICULTY[q?.difficulty]

  const pick = (opt) => {
    if (selected) return
    setSelected(opt)
    setTimeout(() => {
      const newAnswers = { ...answers, [q.id]: opt }
      setAnswers(newAnswers)
      setSelected(null)
      if (current + 1 < QUESTIONS.length) {
        setCurrent(c => c + 1)
      } else {
        const ts = scoreByTopic(newAnswers)
        const ds = scoreByDifficulty(newAnswers)
        setTopicScores(ts)
        setDifficultyScores(ds)
        setPhase('result')
        saveResult(newAnswers, ts, ds)
      }
    }, 1400)
  }

  const saveResult = async (ans, ts, ds) => {
    setSaving(true)
    try {
      const weak = getWeakTopics(ts).map(s => s.topic.key)
      const topicPercents = {}
      Object.values(ts).forEach(s => {
        topicPercents[s.topic.key] = {
          correct: s.correct, total: s.total,
          percent: Math.round((s.correct / s.total) * 100)
        }
      })
      const difficultyPercents = {}
      Object.entries(ds).forEach(([tier, s]) => {
        difficultyPercents[tier] = {
          correct: s.correct, total: s.total,
          percent: Math.round((s.correct / s.total) * 100)
        }
      })
      await axios.post('/api/progress/posttest', {
        answers: ans,
        topicScores: topicPercents,
        difficultyScores: difficultyPercents,
        weakTopics: weak,
        totalScore: Object.values(ts).reduce((a, b) => a + b.correct, 0),
        totalItems: QUESTIONS.length
      })
    } catch (err) {
      console.error('Failed to save post-test:', err)
    } finally {
      setSaving(false)
    }
  }

  const total    = topicScores ? Object.values(topicScores).reduce((a, b) => a + b.correct, 0) : 0
  const weakList = topicScores ? getWeakTopics(topicScores) : []
  const pct      = topicScores ? Math.round((total / QUESTIONS.length) * 100) : 0

  /* ── INTRO SCREEN ── */
  if (phase === 'intro') return (
    <div style={{
      minHeight:'100vh', background:'linear-gradient(135deg, #FEF2F2 0%, #fff 55%, #EEF0FF 100%)',
      display:'flex', alignItems:'center', justifyContent:'center', padding:24
    }}>
      <div style={{
        background:'#fff', borderRadius:24, padding:44, maxWidth:560, width:'100%',
        boxShadow:'0 20px 60px rgba(220,38,38,.12)', textAlign:'center'
      }}>
        <div style={{
          width:70, height:70, borderRadius:20, background:'#DC2626',
          display:'flex', alignItems:'center', justifyContent:'center',
          margin:'0 auto 20px', fontSize:32
        }}>☕</div>

        <h1 style={{ fontSize:24, fontWeight:800, margin:'0 0 8px', letterSpacing:'-.02em' }}>
          Java Code Challenge
        </h1>
        <p style={{ fontSize:13, color:C.onyx400, margin:'0 0 24px', lineHeight:1.6 }}>
          <b style={{ color:C.onyx }}>IT 102A — Fundamentals of Programming</b><br/>
          ISPSC Tagudin Campus · BSIT 1st Year
        </p>

        <div style={{
          background:'#FEECEC', borderRadius:14, padding:'16px 20px',
          marginBottom:24, textAlign:'left'
        }}>
          <div style={{ fontSize:13, fontWeight:700, color:'#B91C1C', marginBottom:10 }}>
            Before you start:
          </div>
          {[
            '40 real Java code questions across all 8 syllabus topics',
            'You will trace output, spot bugs, and reason about real-world code',
            'Difficulty ramps up gradually — Easy → Medium → Hard → Extreme',
            'No time limit — read every snippet carefully before answering',
            'An explanation appears after each question to reinforce the concept',
          ].map((item, i) => (
            <div key={i} style={{ display:'flex', alignItems:'flex-start', gap:8, marginBottom:7 }}>
              <div style={{
                width:18, height:18, borderRadius:'50%', background:'#DC2626',
                flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center',
                marginTop:1
              }}>
                <span style={{ color:'#fff', fontSize:10, fontWeight:700 }}>{i+1}</span>
              </div>
              <span style={{ fontSize:13, color:C.onyx600, lineHeight:1.5 }}>{item}</span>
            </div>
          ))}
        </div>

        <div style={{ display:'flex', justifyContent:'center', gap:8, marginBottom:28, flexWrap:'wrap' }}>
          {Object.values(DIFFICULTY).map(d => (
            <span key={d.label} style={{
              background:d.bg, color:d.color, fontSize:11, fontWeight:700,
              padding:'6px 12px', borderRadius:999
            }}>{d.label}</span>
          ))}
        </div>

        <button onClick={() => setPhase('test')} style={{
          width:'100%', background:'#DC2626', color:'#fff', border:'none',
          borderRadius:12, padding:'14px', fontSize:15, fontWeight:700,
          boxShadow:'0 6px 20px rgba(220,38,38,.3)', cursor:'pointer'
        }}>
          Start Challenge →
        </button>
      </div>
    </div>
  )

  /* ── TEST SCREEN ── */
  if (phase === 'test') {
    const isCode = q.question.includes('\n')
    return (
      <div style={{ minHeight:'100vh', background:C.onyx50 }}>
        {/* Top bar */}
        <div style={{
          background:'#fff', borderBottom:`1px solid ${C.onyx100}`,
          padding:'14px 24px', display:'flex', alignItems:'center',
          justifyContent:'space-between', position:'sticky', top:0, zIndex:10, flexWrap:'wrap', gap:8
        }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <div style={{
              width:32, height:32, borderRadius:8, background:'#DC2626',
              display:'flex', alignItems:'center', justifyContent:'center'
            }}>
              <Ico n="code" s={16} c="#fff"/>
            </div>
            <div style={{ fontSize:14, fontWeight:700 }}>Java Code Challenge</div>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
            <div style={{ fontSize:13, color:C.onyx400, fontWeight:500 }}>
              Question <b style={{ color:C.onyx }}>{current + 1}</b> of {QUESTIONS.length}
            </div>
            <div style={{
              background: diffInfo.bg, color: diffInfo.color,
              padding:'4px 10px', borderRadius:999, fontSize:11, fontWeight:700
            }}>
              {diffInfo.label}
            </div>
            <div style={{
              background: topicInfo?.color + '20', color: topicInfo?.color,
              padding:'4px 10px', borderRadius:999, fontSize:11, fontWeight:700
            }}>
              {topicInfo?.icon} {topicInfo?.label}
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div style={{ height:4, background:C.onyx100 }}>
          <div style={{
            height:'100%', width:`${progress}%`,
            background:`linear-gradient(90deg, ${diffInfo.color}, #DC2626)`,
            transition:'width .3s ease'
          }}/>
        </div>

        {/* Question card */}
        <div style={{ maxWidth:720, margin:'40px auto', padding:'0 20px' }}>
          <div style={{
            background:'#fff', borderRadius:20, padding:32,
            boxShadow:'0 4px 24px rgba(15,23,42,.06)',
            border:`1px solid ${C.onyx100}`
          }}>
            {/* Question text / code block */}
            {isCode ? (
              <pre style={{
                background:'#0F172A', color:'#E2E8F0', borderRadius:12,
                padding:'18px 20px', fontSize:13, lineHeight:1.6,
                fontFamily:'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
                overflowX:'auto', marginBottom:22, whiteSpace:'pre-wrap'
              }}>
                {q.question}
              </pre>
            ) : (
              <div style={{
                fontSize:16, fontWeight:600, color:C.onyx,
                lineHeight:1.6, marginBottom:24
              }}>
                {q.question}
              </div>
            )}

            {/* Options */}
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              {['a','b','c','d'].map(opt => {
                const isSelected = selected === opt
                const isCorrect  = isSelected && opt === q.answer
                const isWrong    = isSelected && opt !== q.answer
                const revealed   = selected && opt === q.answer

                let bg = '#fff', border = C.onyx100, color = C.onyx600

                if (isCorrect || revealed) { bg = C.emeraldLight; border = C.emerald; color = C.emeraldDark }
                if (isWrong)               { bg = '#FEECEC';       border = '#EF4444'; color = '#EF4444' }

                return (
                  <button key={opt} onClick={() => pick(opt)}
                    className={isWrong ? 'shake' : ''}
                    style={{
                      background:bg, border:`1.5px solid ${border}`,
                      borderRadius:12, padding:'13px 16px', textAlign:'left',
                      fontSize:13.5, color, fontWeight:500,
                      cursor: selected ? 'default' : 'pointer',
                      transition:'all .15s', display:'flex', alignItems:'center', gap:12,
                      fontFamily: isCode ? 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace' : 'inherit'
                    }}>
                    <span style={{
                      width:26, height:26, borderRadius:'50%', flexShrink:0,
                      background: (isCorrect || revealed) ? C.emerald : isWrong ? '#EF4444' : C.onyx100,
                      color: (isCorrect || revealed || isWrong) ? '#fff' : C.onyx600,
                      display:'flex', alignItems:'center', justifyContent:'center',
                      fontSize:11, fontWeight:700, textTransform:'uppercase'
                    }}>{opt}</span>
                    {q[opt]}
                  </button>
                )
              })}
            </div>

            {/* Explanation, revealed after answering */}
            {selected && (
              <div style={{
                marginTop:16, background:'#EEF0FF', border:`1px solid ${C.purple}33`,
                borderRadius:12, padding:'12px 16px'
              }}>
                <div style={{ fontSize:11, fontWeight:700, color:C.purpleDark, marginBottom:4 }}>
                  💡 Why
                </div>
                <div style={{ fontSize:12.5, color:C.onyx600, lineHeight:1.6 }}>
                  {q.explanation}
                </div>
              </div>
            )}
          </div>

          {/* Mini topic progress indicators */}
          <div style={{ display:'flex', gap:6, marginTop:20, justifyContent:'center', flexWrap:'wrap' }}>
            {TOPICS.map(t => {
              const topicQs = QUESTIONS.filter(qq => qq.topic === t.id)
              const answered = topicQs.filter(qq => answers[qq.id]).length
              return (
                <div key={t.id} style={{
                  fontSize:10, fontWeight:600, padding:'4px 8px',
                  borderRadius:999, background: answered === topicQs.length ? t.color + '25' : C.onyx100,
                  color: answered === topicQs.length ? t.color : C.onyx400
                }}>
                  {t.icon} {answered}/{topicQs.length}
                </div>
              )
            })}
          </div>
        </div>
      </div>
    )
  }

  /* ── RESULT SCREEN ── */
  if (phase === 'result') return (
    <div style={{ minHeight:'100vh', background:C.onyx50, padding:'32px 20px 64px' }}>
      <div style={{ maxWidth:720, margin:'0 auto' }}>

        {/* Header */}
        <div style={{
          background:'#fff', borderRadius:20, padding:32,
          textAlign:'center', marginBottom:20,
          boxShadow:'0 4px 24px rgba(15,23,42,.06)', border:`1px solid ${C.onyx100}`
        }}>
          <div style={{ fontSize:48, marginBottom:12 }}>
            {pct >= 75 ? '🏆' : pct >= 50 ? '📊' : '📋'}
          </div>
          <h2 style={{ fontSize:22, fontWeight:800, margin:'0 0 6px' }}>Challenge Complete!</h2>
          <p style={{ fontSize:13, color:C.onyx400, margin:'0 0 20px' }}>
            IT 102A — Fundamentals of Programming · ISPSC Tagudin
          </p>

          <div style={{
            width:110, height:110, borderRadius:'50%', margin:'0 auto 20px',
            background:`conic-gradient(${pct >= 75 ? C.emerald : pct >= 50 ? C.amber : '#DC2626'} ${pct * 3.6}deg, ${C.onyx100} 0deg)`,
            display:'flex', alignItems:'center', justifyContent:'center'
          }}>
            <div style={{
              width:84, height:84, borderRadius:'50%', background:'#fff',
              display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column'
            }}>
              <div style={{ fontSize:22, fontWeight:800, color:C.onyx }}>{total}</div>
              <div style={{ fontSize:10, color:C.onyx400, fontWeight:500 }}>/ {QUESTIONS.length}</div>
            </div>
          </div>

          <div style={{ fontSize:15, fontWeight:700, color:C.onyx }}>
            {pct}% — {pct >= 75 ? 'Strong Java logic!' : pct >= 50 ? 'Some areas need attention' : 'Several topics need review'}
          </div>

          {weakList.length > 0 && (
            <div style={{
              background:'#FFF6E5', border:`1px solid ${C.amber}44`,
              borderRadius:12, padding:'12px 16px', marginTop:16, textAlign:'left'
            }}>
              <div style={{ fontSize:12, fontWeight:700, color:C.amberDark, marginBottom:8 }}>
                ⚠️ Topics that need extra attention:
              </div>
              {weakList.map(s => (
                <div key={s.topic.id} style={{
                  fontSize:12, color:C.amberDark, marginBottom:4,
                  display:'flex', alignItems:'center', gap:6
                }}>
                  {s.topic.icon} {s.topic.label} — {s.correct}/{s.total} correct ({Math.round(s.correct/s.total*100)}%)
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Per-difficulty breakdown */}
        <div style={{
          background:'#fff', borderRadius:20, padding:24,
          marginBottom:20, border:`1px solid ${C.onyx100}`
        }}>
          <div style={{ fontSize:15, fontWeight:700, marginBottom:16 }}>How Far Did Your Logic Hold Up?</div>
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            {Object.entries(DIFFICULTY).map(([tier, meta]) => {
              const s = difficultyScores[tier]
              const dpct = Math.round((s.correct / s.total) * 100)
              return (
                <div key={tier}>
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:5 }}>
                    <span style={{ fontSize:13, fontWeight:600, color:meta.color }}>{meta.label}</span>
                    <span style={{ fontSize:12, fontWeight:700, color:C.onyx600 }}>{s.correct}/{s.total} ({dpct}%)</span>
                  </div>
                  <div style={{ height:7, background:C.onyx100, borderRadius:999, overflow:'hidden' }}>
                    <div style={{ height:'100%', borderRadius:999, width:`${dpct}%`, background:meta.color, transition:'width .6s ease' }}/>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Per-topic breakdown */}
        <div style={{
          background:'#fff', borderRadius:20, padding:24,
          marginBottom:20, border:`1px solid ${C.onyx100}`
        }}>
          <div style={{ fontSize:15, fontWeight:700, marginBottom:16 }}>Topic Breakdown</div>
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            {TOPICS.map(t => {
              const s = topicScores[t.id]
              const tpct = Math.round((s.correct / s.total) * 100)
              const weak = tpct < 50
              return (
                <div key={t.id}>
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:5 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:7 }}>
                      <span style={{ fontSize:15 }}>{t.icon}</span>
                      <span style={{ fontSize:13, fontWeight:600, color:C.onyx }}>{t.label}</span>
                      {weak && (
                        <span style={{ background:'#FFF6E5', color:C.amberDark, fontSize:10, fontWeight:700, padding:'2px 7px', borderRadius:999 }}>⚠️ Weak</span>
                      )}
                    </div>
                    <span style={{ fontSize:12, fontWeight:700, color: tpct >= 75 ? C.emeraldDark : tpct >= 50 ? C.amberDark : '#DC2626' }}>
                      {s.correct}/{s.total} ({tpct}%)
                    </span>
                  </div>
                  <div style={{ height:7, background:C.onyx100, borderRadius:999, overflow:'hidden' }}>
                    <div style={{ height:'100%', borderRadius:999, width:`${tpct}%`, background: tpct >= 75 ? C.emerald : tpct >= 50 ? C.amber : '#DC2626', transition:'width .6s ease' }}/>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <button
          onClick={() => navigate('/dashboard')}
          disabled={saving}
          style={{
            width:'100%', background:'#DC2626', color:'#fff', border:'none',
            borderRadius:14, padding:'16px', fontSize:15, fontWeight:700,
            boxShadow:'0 6px 20px rgba(220,38,38,.3)', cursor:'pointer',
            opacity: saving ? 0.7 : 1
          }}>
          {saving ? 'Saving results...' : '🗺️ Back to Island Map →'}
        </button>
      </div>
    </div>
  )
}
