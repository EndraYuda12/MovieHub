
const API_URL = "https://www.omdbapi.com/";
const API_KEY = "e4e62e97";

const $ = id => document.getElementById(id);

const grid = $("movieGrid");
const message = $("message");
const searchForm = $("searchForm");
const searchInput = $("searchInput");
const searchBtn = $("searchBtn");

let movies = [];
let collectionMode = false;
let requestId = 0;

let collection = [];

try {
  const saved = JSON.parse(localStorage.getItem("moviehub-collection") || "[]");
  if (Array.isArray(saved)) collection = saved;
} catch (error) {
  collection = [];
}

$("currentYear").textContent = new Date().getFullYear();

function showMessage(text) {
  message.textContent = text;
}

function saveCollection() {
  try {
    localStorage.setItem("moviehub-collection", JSON.stringify(collection));
  } catch (error) {
    showMessage("Koleksi tidak dapat disimpan di perangkat ini.");
  }

  updateCollectionCount();
}

function updateCollectionCount() {
  $("collectionCount").textContent = collection.length;
}

function updateNavigation() {
  $("discoverBtn").classList.toggle("active", !collectionMode);
  $("collectionBtn").classList.toggle("active", collectionMode);
}

function isSaved(movie) {
  return collection.some(item => item.imdbID === movie.imdbID);
}

function createCard(movie) {
  const card = document.createElement("article");
  card.className = "movie-card";

  const posterWrap = document.createElement("div");
  posterWrap.className = "poster-wrap";

  if (movie.Poster && movie.Poster !== "N/A") {
    const poster = document.createElement("img");
    poster.className = "poster";
    poster.src = movie.Poster;
    poster.alt = "Poster " + movie.Title;
    poster.loading = "lazy";

    poster.onerror = () => {
      poster.remove();

      const placeholder = document.createElement("div");
      placeholder.className = "poster-placeholder";
      placeholder.textContent = "Poster tidak tersedia";
      posterWrap.appendChild(placeholder);
    };

    posterWrap.appendChild(poster);
  } else {
    const placeholder = document.createElement("div");
    placeholder.className = "poster-placeholder";
    placeholder.textContent = "Poster tidak tersedia";
    posterWrap.appendChild(placeholder);
  }

  const info = document.createElement("div");
  info.className = "movie-info";

  const title = document.createElement("h3");
  title.className = "movie-title";
  title.textContent = movie.Title || "Judul tidak tersedia";

  const year = document.createElement("p");
  year.className = "movie-year";
  year.textContent = movie.Year || "Tahun tidak diketahui";

  const action = document.createElement("button");
  action.className = "movie-action";

  function updateButton() {
    const saved = isSaved(movie);

    action.textContent = collectionMode
      ? "Hapus dari koleksi"
      : saved
        ? "✓ Tersimpan"
        : "+ Tambah ke koleksi";

    action.classList.toggle("remove", collectionMode);
  }

  action.addEventListener("click", () => {
    if (isSaved(movie)) {
      collection = collection.filter(item => item.imdbID !== movie.imdbID);
    } else {
      collection.push({
        imdbID: movie.imdbID,
        Title: movie.Title,
        Year: movie.Year,
        Poster: movie.Poster
      });
    }

    saveCollection();

    if (collectionMode) {
      renderMovies(collection);
      showMessage(collection.length ? "" : "Koleksi kamu masih kosong. Tambahkan film yang kamu suka!");
    } else {
      updateButton();
    }
  });

  updateButton();

  info.append(title, year, action);
  card.append(posterWrap, info);

  return card;
}

function renderMovies(list) {
  grid.replaceChildren();

  $("resultCount").textContent = list.length
    ? `${list.length} film`
    : "";

  list.forEach(movie => {
    grid.appendChild(createCard(movie));
  });
}

async function fetchMovies(params) {
  const url = new URL(API_URL);

  url.searchParams.set("apikey", API_KEY);

  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Koneksi API gagal (HTTP ${response.status}).`);
  }

  const data = await response.json();

  if (data.Response !== "True") {
    throw new Error(data.Error || "Film tidak ditemukan.");
  }

  return data;
}

function showApiError(error) {
  console.error("MovieHub:", error);

  const text = error.message || "";

  if (text.includes("Invalid API key")) {
    showMessage("API key tidak valid. Periksa kembali key OMDb di script.js.");
  } else if (text.includes("limit")) {
    showMessage("Batas permintaan API tercapai. Coba lagi nanti.");
  } else if (text.includes("Failed to fetch")) {
    showMessage("Tidak dapat terhubung ke API. Periksa internet dan coba buka melalui browser.");
  } else {
    showMessage("Terjadi masalah saat memuat film: " + text);
  }
}

async function searchMovies(query) {
  const currentRequest = ++requestId;
  collectionMode = false;
  updateNavigation();

  $("sectionEyebrow").textContent = "HASIL PENCARIAN";
  $("sectionTitle").textContent = `Hasil untuk "${query}"`;

  grid.replaceChildren();
  $("resultCount").textContent = "";
  showMessage("Sedang mencari film...");
  searchBtn.disabled = true;

  try {
    const data = await fetchMovies({
      s: query,
      type: "movie"
    });

    if (currentRequest !== requestId) return;

    movies = data.Search || [];
    renderMovies(movies);
    showMessage(movies.length ? "" : "Film tidak ditemukan.");
  } catch (error) {
    if (currentRequest === requestId) showApiError(error);
  } finally {
    if (currentRequest === requestId) searchBtn.disabled = false;
  }
}

async function loadPopularMovies() {
  const currentRequest = ++requestId;
  collectionMode = false;
  updateNavigation();

  $("sectionEyebrow").textContent = "PILIHAN UNTUKMU";
  $("sectionTitle").textContent = "Jelajahi Film";

  grid.replaceChildren();
  $("resultCount").textContent = "";
  showMessage("Memuat film...");
  searchBtn.disabled = false;

  const queries = ["Avengers", "Batman", "Spider-Man", "Harry Potter"];
  const found = [];
  const seen = new Set();

  try {
    for (const query of queries) {
      if (currentRequest !== requestId) return;

      const data = await fetchMovies({
        s: query,
        type: "movie"
      });

      for (const movie of data.Search || []) {
        if (!seen.has(movie.imdbID)) {
          seen.add(movie.imdbID);
          found.push(movie);
        }

        if (found.length >= 12) break;
      }

      if (found.length >= 12) break;
    }

    if (currentRequest !== requestId) return;

    movies = found;
    renderMovies(movies);
    showMessage(movies.length ? "" : "Film belum tersedia.");
  } catch (error) {
    if (currentRequest === requestId) showApiError(error);
  }
}

function showCollection() {
  ++requestId;
  collectionMode = true;
  updateNavigation();

  $("sectionEyebrow").textContent = "FILM PILIHANMU";
  $("sectionTitle").textContent = "Koleksi Saya";

  renderMovies(collection);
  showMessage(collection.length
    ? ""
    : "Koleksi kamu masih kosong. Cari film dan tambahkan ke koleksi!");

  searchBtn.disabled = false;
}

searchForm.addEventListener("submit", event => {
  event.preventDefault();

  const query = searchInput.value.trim();

  if (query) searchMovies(query);
});

$("discoverBtn").addEventListener("click", loadPopularMovies);
$("homeBtn").addEventListener("click", event => {
  event.preventDefault();
  searchInput.value = "";
  loadPopularMovies();
});

$("collectionBtn").addEventListener("click", showCollection);

updateCollectionCount();
loadPopularMovies();
