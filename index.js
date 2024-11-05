document.addEventListener('DOMContentLoaded', (event) => {

  const playButton = document.getElementById('play');
  const board = document.querySelector('.board');
  const activeClue = document.getElementById('activeClue');
  const answerForm = document.getElementById('answerForm');
  const userAnswerInput = document.getElementById('userAnswer');

  const NUM_CATEGORIES = 4;
  const QUESTIONS_PER_CAT = 4;
  let categoryIds = [];


  // Initialize score:
  let score = 0;

  // Track current clue
  let currentClue = null;


  // Display score

  const scoreDisplay = document.createElement('div');
  scoreDisplay.id = 'scoreDisplay';
  scoreDisplay.textContent = `Score: ${score}`;
  document.body.appendChild(scoreDisplay);


  // "Start Game" 
  playButton.addEventListener('click', async () => {
      categoryIds = await getCategoryIds();
      const game = new JeopardyGame(categoryIds);
      await game.initializeGame();
  });



  async function getCategoryIds() {
      try {
          console.log('Fetching category IDs...');
          const response = await fetch("https://rithm-jeopardy.herokuapp.com/api/categories?count=100");

          if (!response.ok) {
              throw new Error(`HTTP error! status: ${response.status}`);
          }

          const data = await response.json();
          //  console.log('Successfully fetched category IDs:', data);

          // make it so that each category is differnt
          // 1. Create a Set to store unique IDs
          const uniqueIds = new Set();

          // 2. Add IDs to the Set (duplicates will be ignored)
          data.forEach(category => uniqueIds.add(category.id));

          // 3. Convert the Set back to an array
          const uniqueIdsArray = Array.from(uniqueIds);

          // 4. Shuffle and return the required number of IDs
          const shuffled = uniqueIdsArray.sort(() => 0.5 - Math.random());
          return shuffled.slice(0, NUM_CATEGORIES);


      } catch (error) {
          console.error('Error in getCategoryIds:', error);
          return [];
      }
  }



  class JeopardyGame {
      constructor(categoryIds) {
          this.clues = {};
          this.categoryIds = categoryIds;
      }

      async initializeGame() {
          await this.fetchCategories();
          this.processCategories();

          this.renderClueValues();
      }


      async fetchCategories() {
          try {
              this.categories = await Promise.all(
                  this.categoryIds.map(id => this.getCategory(id))
              );
              this.renderCategories();
              this.renderClueValues()

          } catch (error) {
              console.error('Error fetching categories:', error);
          }
      }



      // makes a request to the API for a single category
      async getCategory(catId) {
          try {
              console.log(`Fetching category details for ID: ${catId}`);
              const response = await fetch(`https://rithm-jeopardy.herokuapp.com/api/category?id=${catId}`);

              if (!response.ok) {
                  throw new Error(`HTTP error! status: ${response.status}`);
              }

              const data = await response.json();
              console.log(`Successfully fetched category details for ID ${catId}:`, data);
              return data; // single category object
          } catch (error) {
              console.error(`Error in getCategory for ID ${catId}:`, error);
              return null;
          }
      }
      processCategories() {
          this.categories.forEach((category, categoryIndex) => {
              if (category && category.clues) {
                  category.clues.slice(0, QUESTIONS_PER_CAT).forEach((clue, clueIndex) => {
                      const clueId = `${categoryIndex}-${clueIndex}`;
                      this.clues[clueId] = {
                          question: clue.question,
                          answer: clue.answer,
                          value: clue.value || (clueIndex + 1) * 100
                      };
                  });
              }
          });
      }

      renderCategories() {
          const categoryHeaders = document.querySelectorAll('.categories');

          this.categories.forEach((category, index) => {
              if (category && categoryHeaders[index]) {
                  categoryHeaders[index].textContent = category.title; // Access title from the inner array
              }
          });
      }

      renderClueValues() {
          const squares = document.querySelectorAll('.square');

          squares.forEach((square, index) => {
              const categoryIndex = index % NUM_CATEGORIES;
              const clueIndex = Math.floor(index / NUM_CATEGORIES);
              const clueId = `${categoryIndex}-${clueIndex}`;

              const clue = this.clues[clueId];

              if (clue) {
                  const valueSpan = square.querySelector('.cashValue');
                  if (valueSpan) {
                      valueSpan.textContent = `$${clue.value || (clueIndex + 1) * 100}`;
                  }
                  square.addEventListener('click', () => this.handleSquareClick(square, clue));
              }
          });
      }



      handleSquareClick(square, clue) {

          //ensure clue exists
          if (!clue) {
              console.error('Clue is undefined');
              return;
          }

          if (clue.showing === 'answer') {
              return; //  Skip if clue has already been revealed
          }

          let msg, newShowing;
          if (!clue.showing) {
              msg = clue.question;
              newShowing = 'question';
          } else {
              msg = clue.answer;
              newShowing = 'answer';
              square.classList.add('revealed'); //Mark clue as revealed
          }
          clue.showing = newShowing;

          // Add content to #activeClue, including the form and close button
          activeClue.innerHTML = `
  <p class="clue-value">$${clue.value}</p>
  <p class="clue-text">${msg}</p>
  <form id="answerForm">
    <input type="text" id="userAnswer" placeholder="Your answer" >
    <button type="submit">Submit</button>
  </form>
`;

          activeClue.style.display = 'block'; // Show the question div

          // Set current clue 
          currentClue = clue;



          // Add event listener for form submission to capture the answer


          document.getElementById('answerForm').addEventListener('submit', (event) => {
                  event.preventDefault();


                  // Get the user's answer and compare it to the correct answer
                  const userAnswer = document.getElementById('userAnswer').value.trim().toLowerCase();
                  const correctAnswer = currentClue.answer.toLowerCase();


                  if (userAnswer === correctAnswer) {
                      score += currentClue.value;
                      scoreDisplay.textContent = `Score: ${score}`;
                      alert("Correct!");
                  } else {
                      score -= currentClue.value;
                      scoreDisplay.textContent = `Score: ${score}`;
                      alert(`Incorrect! The correct answer was: ${currentClue.answer}`);
                  }

                  // Update the score display
                  scoreDisplay.textContent = `Score: ${score}`;
                  hideClue();
          

                  function showClue() {
                    activeClue.style.display = 'block';
                    document.body.classList.add('overlay-active');
                  }
                
                  function hideClue() {
                    activeClue.style.display = 'none';
                    document.body.classList.remove('overlay-active');
                    currentClue = null;
                  }
                  document.addEventListener('keydown', (event) => {
                    if (event.key === 'Escape' && activeClue.style.display === 'block') {
                      hideClue();
                    }    
              

              });
              

             
            })

          }

};

});