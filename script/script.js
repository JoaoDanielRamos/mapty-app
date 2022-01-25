'use strict';

// ? => VARIABLES
const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const inputElevation = document.querySelector('.form__input--elevation');

// ? ==> WORKOUT CLASS CONSTRUCTORS

class Workout {
  date = new Date();
  id = String(Date.now()).slice(-10);

  constructor(coords, distance, duration) {
    // this.date = ...
    // this.id = ...
    this.coords = coords; // [lat, lng]
    this.distance = distance; // in km
    this.duration = duration; // in min
  }
}

class Running extends Workout {
  type = 'running';
  description;
  emoji = '🏃‍♂️';
  emoji2 = '🦶🏼';
  unit = 'min/km';
  unit2 = 'spm';
  constructor(coords, distance, duration, cadence) {
    super(coords, distance, duration);
    this.cadence = cadence;
    this.calcPace();
    this.setDescription();
  }

  setDescription() {
    const months = [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
    ];

    this.description = `Running on ${
      months[this.date.getMonth()]
    } ${this.date.getDate()}`;
  }

  calcPace() {
    //min/km
    this.pace = (this.duration / this.distance).toFixed(2);
    return this.pace;
  }
}

class Cycling extends Workout {
  type = 'cycling';
  description;
  emoji = '🚴‍♀️';
  emoji2 = '⛰';
  unit = 'km/h';
  unit2 = 'm';
  constructor(coords, distance, duration, elevationGain) {
    super(coords, distance, duration);
    this.elevationGain = elevationGain;
    this.calcSpeed();
    this.setDescription();
  }

  setDescription() {
    const months = [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
    ];

    this.description = `Cycling on ${
      months[this.date.getMonth()]
    } ${this.date.getDate()}`;
  }

  calcSpeed() {
    // km/h
    this.speed = (this.distance / (this.duration / 60)).toFixed(2);
    return this.speed;
  }
}

// ? ==> APP ARCHITECTURE

class App {
  #map;
  #mapEvent;
  #marker;
  #popup;
  #listOfWorkouts = [];

  constructor() {
    // * 1 - Getting geolocation, loading the map, allow map clicks, shows form and clear inputs
    this._getLocalStorageData();

    this._getPosition();

    // * 2 - submit form and generate market and popup, form shakes if fields are empty or contains data types different than
    form.addEventListener('submit', this._newWorkout.bind(this));

    // * 3 - changing input boxes when type of exercise changes
    inputType.addEventListener('change', this._toggleElevationField.bind(this));

    // * Moving map to marker
    containerWorkouts.addEventListener('click', this._moveToPopUp.bind(this));
  }

  _getPosition() {
    if (navigator.geolocation)
      navigator.geolocation.getCurrentPosition(
        this._loadMap.bind(this),
        function () {
          alert('Could not get your position');
        }
      );
  }

  _loadMap(position) {
    const { latitude, longitude } = position.coords;
    const coords = [latitude, longitude];

    this.#map = L.map('map').setView(coords, 13);

    L.tileLayer('https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);

    // ! MAP EVENT LISTENER
    this.#map.on('click', this._showForm.bind(this));

    this.#listOfWorkouts.forEach(work => {
      this._renderWorkout(work);
      this._insertMarker(work).bindPopup(this._insertPopup(work)).openPopup();
    });

    return coords;
  }

  _showForm(mapE) {
    this.#mapEvent = mapE;
    this._cleanFields();
    form.classList.remove('hidden');
    inputDistance.focus();
  }

  _hideForm() {
    form.style.display = 'none';
    form.classList.add('hidden');

    setTimeout(() => {
      form.style.display = 'grid';
    }, 1000);
  }

  _newWorkout(formEvent) {
    formEvent.preventDefault();

    // Get data from form
    let userData = {
      workoutType: inputType.value,
      distance: +inputDistance.value,
      duration: +inputDuration.value,
      cadenceOrSpeed:
        inputType.value === 'running'
          ? +inputCadence.value
          : +inputElevation.value,
    };

    // Separate input values
    let { distance, duration, cadenceOrSpeed } = userData;
    const { lat, lng } = this.#mapEvent.latlng;
    let workout;

    if (
      [distance, duration, cadenceOrSpeed].some(
        input => isNaN(input) || input <= 0
      )
    ) {
      this._formShake();
    } else {
      // If workout is running, create running object
      if (userData.workoutType === 'running')
        workout = new Running(
          [lat, lng],
          userData.distance,
          userData.duration,
          userData.cadenceOrSpeed
        );

      // If workout is cycling, create cycling object
      if (userData.workoutType === 'cycling')
        workout = new Cycling(
          [lat, lng],
          userData.distance,
          userData.duration,
          userData.cadenceOrSpeed
        );

      // Add new object to workout array
      this.#listOfWorkouts.push(workout);

      // Render workout on map as marker
      this._insertMarker(workout)
        .bindPopup(this._insertPopup(workout))
        .openPopup();

      // Render workout list
      this._renderWorkout(workout);

      // Set local storage to all workouts
      this._setLocalStorage();

      // Hide form + clear input field
      this._hideForm();
      this._cleanFields();

      return workout;
    }
  }

  _insertMarker(workoutCoordinates) {
    this.#marker = L.marker(workoutCoordinates.coords, {
      opacity: 1,
      pane: 'markerPane',
      shadowPane: 'shadowPane',
      riseOnHover: true,
    });

    this.#marker.addTo(this.#map);

    return this.#marker;
  }

  _insertPopup(workoutData) {
    const popUpTextContent = `
    <p> ${workoutData.emoji} ${workoutData.description}</p>
   `;

    this.#popup = L.popup({
      maxWidth: 1000,
      minWidth: 100,
      autoClose: false,
      closeOnClick: false,
      className: `${workoutData.type}-popup`,
    }).setContent(popUpTextContent);
    return this.#popup;
  }

  _renderWorkout(workoutData) {
    form.insertAdjacentHTML(
      'afterend',
      `
  <li class="workout workout--${workoutData.type}" data-id="${workoutData.id}">

    <h2 class="workout__title">${workoutData.description}</h2>

    <div class="workout__details">
      <span class="workout__icon">${workoutData.emoji}</span>
      <span class="workout__value">${workoutData.distance}</span>
      <span class="workout__unit">km</span>
    </div>

    <div class="workout__details">
      <span class="workout__icon">⏱</span>
      <span class="workout__value">${workoutData.duration}</span>
      <span class="workout__unit">min</span>
    </div>

    <div class="workout__details">
      <span class="workout__icon">⚡️</span>
      <span class="workout__value">${
        workoutData.type === 'running' ? workoutData.pace : workoutData.speed
      }</span>
      <span class="workout__unit">${workoutData.unit}</span>
    </div>

    <div class="workout__details">
      <span class="workout__icon">${workoutData.emoji2} </span>
      <span class="workout__value">${
        workoutData.type === 'running'
          ? workoutData.cadence
          : workoutData.elevationGain
      }</span>
      <span class="workout__unit">${workoutData.unit2}</span>
    </div>

  </i>`
    );
  }

  _toggleElevationField() {
    inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
    inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
  }

  _cleanFields() {
    inputDistance.value =
      inputDuration.value =
      inputCadence.value =
      inputElevation.value =
        '';
  }

  _formShake() {
    form.classList.add('form-shake');
    setTimeout(() => {
      form.classList.remove('form-shake');
    }, 500);
  }

  _moveToPopUp(e) {
    const workoutEl = e.target.closest('.workout');

    if (!workoutEl) return;

    const workout = this.#listOfWorkouts.find(
      work => work.id === workoutEl.dataset.id
    );

    this.#map.setView(workout.coords, 13, {
      animate: true,
      pan: {
        duration: 1,
      },
    });
  }

  _setLocalStorage() {
    localStorage.setItem('workouts', JSON.stringify(this.#listOfWorkouts));
    // JSON.stringify turn objects into strings
  }

  _getLocalStorageData() {
    const data = JSON.parse(localStorage.getItem('workouts'));

    if (!data) return;

    this.#listOfWorkouts = data;
  }

  reset() {
    localStorage.removeItem('workouts');
    location.reload();
  }
}

const app = new App();

// ! Features to be added
// TODO - edit a workout
// TODO - delete a workout
// TODO - delete all workouts
// TODO - sort workouts (by distance, or duration)
// TODO - Re-build running and cycling objects coming from local storage
// TODO - More realistic error and confirmation messages
// TODO - Position the map to show all workout [very hard]
// TODO - Draw lines and shapes instead of just points [very hard]
// TODO - Geocode Location from coordinates ('Run in Vancouver, Canada') [very hard]
// TODO - Display weather data for workout time and place
