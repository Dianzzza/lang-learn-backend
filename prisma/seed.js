// prisma/seed.js
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const fruits = await prisma.category.upsert({
    where: { name: "Fruits" },
    update: {},
    create: { name: "Fruits" },
  });

  const animals = await prisma.category.upsert({
    where: { name: "Animals" },
    update: {},
    create: { name: "Animals" },
  });

  const home = await prisma.category.upsert({
    where: { name: "Home" },
    update: {},
    create: { name: "Home" },
  });

  // =========================
  // FLASHCARDS (bez duplikatów)
  // =========================
  await prisma.flashcard.createMany({
    data: [
      { front: "apple", back: "jabłko", isGlobal: true, categoryId: fruits.id },
      { front: "pear", back: "gruszka", isGlobal: true, categoryId: fruits.id },
      { front: "banana", back: "banan", isGlobal: true, categoryId: fruits.id },
      {
        front: "strawberry",
        back: "truskawka",
        isGlobal: true,
        categoryId: fruits.id,
      },
      {
        front: "orange",
        back: "pomarańcza",
        isGlobal: true,
        categoryId: fruits.id,
      },
      {
        front: "grape",
        back: "winogrono",
        isGlobal: true,
        categoryId: fruits.id,
      },
      {
        front: "lemon",
        back: "cytryna",
        isGlobal: true,
        categoryId: fruits.id,
      },
      {
        front: "peach",
        back: "brzoskwinia",
        isGlobal: true,
        categoryId: fruits.id,
      },
      { front: "plum", back: "śliwka", isGlobal: true, categoryId: fruits.id },
      {
        front: "watermelon",
        back: "arbuz",
        isGlobal: true,
        categoryId: fruits.id,
      },

      { front: "cat", back: "kot", isGlobal: true, categoryId: animals.id },
      { front: "dog", back: "pies", isGlobal: true, categoryId: animals.id },
      { front: "cow", back: "krowa", isGlobal: true, categoryId: animals.id },
      { front: "horse", back: "koń", isGlobal: true, categoryId: animals.id },
      { front: "sheep", back: "owca", isGlobal: true, categoryId: animals.id },
      { front: "pig", back: "świnia", isGlobal: true, categoryId: animals.id },
      {
        front: "chicken",
        back: "kurczak / kura",
        isGlobal: true,
        categoryId: animals.id,
      },
      { front: "duck", back: "kaczka", isGlobal: true, categoryId: animals.id },
      { front: "bird", back: "ptak", isGlobal: true, categoryId: animals.id },
      { front: "fish", back: "ryba", isGlobal: true, categoryId: animals.id },

      { front: "chair", back: "krzesło", isGlobal: true, categoryId: home.id },
      { front: "table", back: "stół", isGlobal: true, categoryId: home.id },
      { front: "bed", back: "łóżko", isGlobal: true, categoryId: home.id },
      { front: "door", back: "drzwi", isGlobal: true, categoryId: home.id },
      { front: "window", back: "okno", isGlobal: true, categoryId: home.id },
      {
        front: "sofa",
        back: "sofa / kanapa",
        isGlobal: true,
        categoryId: home.id,
      },
      { front: "lamp", back: "lampa", isGlobal: true, categoryId: home.id },
      { front: "floor", back: "podłoga", isGlobal: true, categoryId: home.id },
      { front: "ceiling", back: "sufit", isGlobal: true, categoryId: home.id },
      {
        front: "kitchen",
        back: "kuchnia",
        isGlobal: true,
        categoryId: home.id,
      },
    ],
    skipDuplicates: true,
  });

  // =========================
  // QUIZZES (bez duplikatów) - wymaga @@unique([categoryId, question])
  // =========================
  const quizzes = [
    {
      categoryId: fruits.id,
      question: "I am eating an ______ for breakfast.",
      correctWord: "apple",
      polishWord: "jabłko",
    },
    {
      categoryId: fruits.id,
      question: "She bought a ripe ______ at the market.",
      correctWord: "banana",
      polishWord: "banan",
    },
    {
      categoryId: fruits.id,
      question: "He squeezed a fresh ______ to make juice.",
      correctWord: "orange",
      polishWord: "pomarańcza",
    },
    {
      categoryId: fruits.id,
      question: "There is a slice of ______ on the plate.",
      correctWord: "watermelon",
      polishWord: "arbuz",
    },
    {
      categoryId: fruits.id,
      question: "I put a green ______ in my lunch box.",
      correctWord: "pear",
      polishWord: "gruszka",
    },
    {
      categoryId: fruits.id,
      question: "We picked a sweet ______ from the tree.",
      correctWord: "peach",
      polishWord: "brzoskwinia",
    },
    {
      categoryId: fruits.id,
      question: "She ate a sour ______ with tea.",
      correctWord: "lemon",
      polishWord: "cytryna",
    },
    {
      categoryId: fruits.id,
      question: "He loves purple ______ in his dessert.",
      correctWord: "grape",
      polishWord: "winogrono",
    },
    {
      categoryId: fruits.id,
      question: "I have a small ______ in my hand.",
      correctWord: "plum",
      polishWord: "śliwka",
    },
    {
      categoryId: fruits.id,
      question: "We shared a bowl of ______ ice cream.",
      correctWord: "strawberry",
      polishWord: "truskawka",
    },

    {
      categoryId: animals.id,
      question: "The ______ is barking loudly.",
      correctWord: "dog",
      polishWord: "pies",
    },
    {
      categoryId: animals.id,
      question: "The ______ is sleeping on the sofa.",
      correctWord: "cat",
      polishWord: "kot",
    },
    {
      categoryId: animals.id,
      question: "The farmer is milking the ______.",
      correctWord: "cow",
      polishWord: "krowa",
    },
    {
      categoryId: animals.id,
      question: "He is riding a ______ in the countryside.",
      correctWord: "horse",
      polishWord: "koń",
    },
    {
      categoryId: animals.id,
      question: "A flock of ______ is walking in the field.",
      correctWord: "sheep",
      polishWord: "owca",
    },
    {
      categoryId: animals.id,
      question: "There is a pink ______ in the farmyard.",
      correctWord: "pig",
      polishWord: "świnia",
    },
    {
      categoryId: animals.id,
      question: "The ______ is laying an egg.",
      correctWord: "chicken",
      polishWord: "kura",
    },
    {
      categoryId: animals.id,
      question: "The ______ is swimming on the pond.",
      correctWord: "duck",
      polishWord: "kaczka",
    },
    {
      categoryId: animals.id,
      question: "A small ______ is sitting on the tree.",
      correctWord: "bird",
      polishWord: "ptak",
    },
    {
      categoryId: animals.id,
      question: "The ______ is swimming in the aquarium.",
      correctWord: "fish",
      polishWord: "ryba",
    },

    {
      categoryId: home.id,
      question: "She is sitting on a ______.",
      correctWord: "chair",
      polishWord: "krzesło",
    },
    {
      categoryId: home.id,
      question: "I put the book on the ______.",
      correctWord: "table",
      polishWord: "stół",
    },
    {
      categoryId: home.id,
      question: "I am going to sleep in my ______.",
      correctWord: "bed",
      polishWord: "łóżko",
    },
    {
      categoryId: home.id,
      question: "Please open the ______.",
      correctWord: "door",
      polishWord: "drzwi",
    },
    {
      categoryId: home.id,
      question: "The ______ is open and fresh air is coming in.",
      correctWord: "window",
      polishWord: "okno",
    },
    {
      categoryId: home.id,
      question: "We are watching TV on the ______.",
      correctWord: "sofa",
      polishWord: "sofa",
    },
    {
      categoryId: home.id,
      question: "I turned on the ______ to read a book.",
      correctWord: "lamp",
      polishWord: "lampa",
    },
    {
      categoryId: home.id,
      question: "The ball is rolling on the ______.",
      correctWord: "floor",
      polishWord: "podłoga",
    },
    {
      categoryId: home.id,
      question: "There is a spider on the ______.",
      correctWord: "ceiling",
      polishWord: "sufit",
    },
    {
      categoryId: home.id,
      question: "I am cooking dinner in the ______.",
      correctWord: "kitchen",
      polishWord: "kuchnia",
    },
  ];

  for (const q of quizzes) {
    await prisma.quiz.upsert({
      where: {
        categoryId_question: {
          categoryId: q.categoryId,
          question: q.question,
        },
      },
      update: {
        correctWord: q.correctWord,
        polishWord: q.polishWord,
      },
      create: q,
    });
  }

  // =========================
  // TEST TEMPLATES (bez duplikatów) - wymaga @@unique([categoryId, sentence])
  // =========================
  const templates = [
    // FRUITS
    {
      categoryId: fruits.id,
      sentence: "There is a red ______ on the plate.",
      answer: "apple",
      polishWord: "jabłko",
    },
    {
      categoryId: fruits.id,
      sentence: "Monkeys love to eat a ______.",
      answer: "banana",
      polishWord: "banan",
    },
    {
      categoryId: fruits.id,
      sentence: "He peeled an ______ and ate it.",
      answer: "orange",
      polishWord: "pomarańcza",
    },
    {
      categoryId: fruits.id,
      sentence: "They cut the big ______ into slices.",
      answer: "watermelon",
      polishWord: "arbuz",
    },
    {
      categoryId: fruits.id,
      sentence: "She is eating a juicy ______.",
      answer: "pear",
      polishWord: "gruszka",
    },
    {
      categoryId: fruits.id,
      sentence: "We bought a sweet ______ at the shop.",
      answer: "peach",
      polishWord: "brzoskwinia",
    },
    {
      categoryId: fruits.id,
      sentence: "He put a slice of ______ in his tea.",
      answer: "lemon",
      polishWord: "cytryna",
    },
    {
      categoryId: fruits.id,
      sentence: "She is washing a bunch of ______.",
      answer: "grapes",
      polishWord: "winogrona",
    },
    {
      categoryId: fruits.id,
      sentence: "I picked a small ______ from the tree.",
      answer: "plum",
      polishWord: "śliwka",
    },
    {
      categoryId: fruits.id,
      sentence: "We made a cake with fresh ______.",
      answer: "strawberries",
      polishWord: "truskawki",
    },

    // ANIMALS
    {
      categoryId: animals.id,
      sentence: "The ______ is playing with a ball.",
      answer: "dog",
      polishWord: "pies",
    },
    {
      categoryId: animals.id,
      sentence: "The ______ is hiding under the bed.",
      answer: "cat",
      polishWord: "kot",
    },
    {
      categoryId: animals.id,
      sentence: "The ______ is eating grass in the field.",
      answer: "cow",
      polishWord: "krowa",
    },
    {
      categoryId: animals.id,
      sentence: "He is brushing his ______ every morning.",
      answer: "horse",
      polishWord: "koń",
    },
    {
      categoryId: animals.id,
      sentence: "A group of ______ is moving together.",
      answer: "sheep",
      polishWord: "owce",
    },
    {
      categoryId: animals.id,
      sentence: "The ______ is sleeping in the mud.",
      answer: "pig",
      polishWord: "świnia",
    },
    {
      categoryId: animals.id,
      sentence: "The ______ is walking to the pond.",
      answer: "duck",
      polishWord: "kaczka",
    },
    {
      categoryId: animals.id,
      sentence: "The ______ is running around the yard.",
      answer: "chicken",
      polishWord: "kurczak / kura",
    },
    {
      categoryId: animals.id,
      sentence: "The ______ is singing in the morning.",
      answer: "bird",
      polishWord: "ptak",
    },
    {
      categoryId: animals.id,
      sentence: "The ______ is swimming in the river.",
      answer: "fish",
      polishWord: "ryba",
    },

    // HOME
    {
      categoryId: home.id,
      sentence: "I am sitting on a ______ at the desk.",
      answer: "chair",
      polishWord: "krzesło",
    },
    {
      categoryId: home.id,
      sentence: "Dinner is on the ______.",
      answer: "table",
      polishWord: "stół",
    },
    {
      categoryId: home.id,
      sentence: "I am lying on my ______.",
      answer: "bed",
      polishWord: "łóżko",
    },
    {
      categoryId: home.id,
      sentence: "Someone is knocking at the ______.",
      answer: "door",
      polishWord: "drzwi",
    },
    {
      categoryId: home.id,
      sentence: "The ______ is closed because it is cold outside.",
      answer: "window",
      polishWord: "okno",
    },
    {
      categoryId: home.id,
      sentence: "We are sitting on the ______ and talking.",
      answer: "sofa",
      polishWord: "sofa",
    },
    {
      categoryId: home.id,
      sentence: "The ______ is on the desk.",
      answer: "lamp",
      polishWord: "lampa",
    },
    {
      categoryId: home.id,
      sentence: "The children are playing on the ______.",
      answer: "floor",
      polishWord: "podłoga",
    },
    {
      categoryId: home.id,
      sentence: "There is a light on the ______.",
      answer: "ceiling",
      polishWord: "sufit",
    },
    {
      categoryId: home.id,
      sentence: "I am making breakfast in the ______.",
      answer: "kitchen",
      polishWord: "kuchnia",
    },
  ];

  for (const t of templates) {
    await prisma.testTemplate.upsert({
      where: {
        categoryId_sentence: {
          categoryId: t.categoryId,
          sentence: t.sentence,
        },
      },
      update: { answer: t.answer, polishWord: t.polishWord },
      create: t,
    });
  }

  console.log("Seeding finished.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
