// URL da API
const API_URL = 'https://rickandmortyapi.com/api';

// Estado da app
let currentPage = 1;
let totalPages = 1;
let characters = [];
let favorites = JSON.parse(localStorage.getItem('favorites')) || [];

// Elementos do DOM
const grid = document.getElementById('charactersGrid');
const loadingEl = document.getElementById('loading');
const paginationEl = document.getElementById('pagination');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const pageInfo = document.getElementById('pageInfo');
const pageInput = document.getElementById('pageInput');
const goToPageBtn = document.getElementById('goToPageBtn');
const searchInput = document.getElementById('searchInput');
const searchBtn = document.getElementById('searchBtn');
const statusFilter = document.getElementById('statusFilter');
const speciesFilter = document.getElementById('speciesFilter');
const favBtn = document.getElementById('favoritesBtn');
const favCount = document.getElementById('favoritesCount');
const charModal = document.getElementById('characterModal');
const favModal = document.getElementById('favoritesModal');
const modalContent = document.getElementById('modalContent');
const favGrid = document.getElementById('favoritesGrid');

// Inicializa a app
document.addEventListener('DOMContentLoaded', () => {
    loadCharacters();
    updateFavCount();
    setupEvents();
});

// Configura os eventos
function setupEvents() {
    // Busca
    searchBtn.addEventListener('click', search);
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') search();
    });

    // Filtros
    statusFilter.addEventListener('change', applyFilters);
    speciesFilter.addEventListener('change', applyFilters);

    // Paginação
    prevBtn.addEventListener('click', () => goToPage(currentPage - 1));
    nextBtn.addEventListener('click', () => goToPage(currentPage + 1));
    goToPageBtn.addEventListener('click', goToSpecificPage);
    pageInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') goToSpecificPage();
    });

    // Favoritos
    favBtn.addEventListener('click', showFavorites);

    // Modais
    document.querySelectorAll('.close').forEach(btn => {
        btn.addEventListener('click', closeModals);
    });

    window.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            closeModals();
        }
    });
}

// Carrega personagens da API
async function loadCharacters(page = 1, filters = {}) {
    try {
        showLoading(true);
        
        const params = new URLSearchParams({
            page: page,
            ...filters
        });

        const response = await fetch(`${API_URL}/character?${params}`);
        const data = await response.json();

        if (response.ok) {
            characters = data.results;
            totalPages = data.info.pages;
            currentPage = page;
            
            renderCharacters();
            updatePagination();
        } else {
            throw new Error('Falha ao carregar personagens');
        }
    } catch (error) {
        console.error('Erro:', error);
        showError('Falha ao carregar personagens. Tenta de novo.');
    } finally {
        showLoading(false);
    }
}

// Renderiza os personagens na grid
function renderCharacters() {
    grid.innerHTML = '';

    if (characters.length === 0) {
        grid.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; color: white; padding: 2rem;">
                <h3>Nenhum personagem encontrado</h3>
                <p>Tenta ajustar os filtros ou a busca</p>
            </div>
        `;
        return;
    }

    characters.forEach(char => {
        const card = createCard(char);
        grid.appendChild(card);
    });
}

// Cria o card do personagem
function createCard(char) {
    const card = document.createElement('div');
    card.className = 'character-card';
    
    const isFav = favorites.some(fav => fav.id === char.id);
    
    card.innerHTML = `
        <img src="${char.image}" alt="${char.name}" class="character-image">
        <div class="character-info">
            <h3 class="character-name">${char.name}</h3>
            <div class="character-status">
                <span class="status-dot ${char.status.toLowerCase()}"></span>
                <span>${char.status} - ${char.species}</span>
            </div>
            <p class="character-species">${char.location.name}</p>
        </div>
        <button class="favorite-btn ${isFav ? 'favorited' : ''}" 
                onclick="toggleFav(event, ${char.id})">
            <i class="fas fa-heart"></i>
        </button>
    `;

    // Clique para abrir modal
    card.addEventListener('click', (e) => {
        if (!e.target.closest('.favorite-btn')) {
            showCharModal(char);
        }
    });

    return card;
}

// Alterna favorito
function toggleFav(event, charId) {
    event.stopPropagation();
    
    const char = characters.find(c => c.id === charId);
    const favIndex = favorites.findIndex(fav => fav.id === charId);
    
    if (favIndex === -1) {
        // Adiciona aos favoritos
        favorites.push({
            id: char.id,
            name: char.name,
            image: char.image,
            status: char.status,
            species: char.species,
            location: char.location.name
        });
        event.target.closest('.favorite-btn').classList.add('favorited');
    } else {
        // Remove dos favoritos
        favorites.splice(favIndex, 1);
        event.target.closest('.favorite-btn').classList.remove('favorited');
    }
    
    // Salva no localStorage
    localStorage.setItem('favorites', JSON.stringify(favorites));
    updateFavCount();
}

// Atualiza contador de favoritos
function updateFavCount() {
    favCount.textContent = favorites.length;
}

// Mostra modal do personagem
async function showCharModal(char) {
    try {
        showLoading(true);
        
        // Busca episódios
        const episodes = await getEpisodes(char.episode);
        
        modalContent.innerHTML = `
            <div class="character-detail">
                <div class="character-detail-header">
                    <img src="${char.image}" alt="${char.name}" class="character-detail-image">
                    <div class="character-detail-info">
                        <h2>${char.name}</h2>
                        <p><strong>Status:</strong> ${char.status}</p>
                        <p><strong>Espécie:</strong> ${char.species}</p>
                        <p><strong>Tipo:</strong> ${char.type || 'N/A'}</p>
                        <p><strong>Gênero:</strong> ${char.gender}</p>
                        <p><strong>Origem:</strong> ${char.origin.name}</p>
                        <p><strong>Localização:</strong> ${char.location.name}</p>
                        <p><strong>Criado em:</strong> ${new Date(char.created).toLocaleDateString('pt-BR')}</p>
                    </div>
                </div>
                <div class="character-detail-episodes">
                    <h3>Episódios (${episodes.length})</h3>
                    <div class="episodes-list">
                        ${episodes.map(ep => `
                            <div class="episode-item">
                                <h4>${ep.name}</h4>
                                <p>${ep.episode} - ${ep.air_date}</p>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;
        
        charModal.style.display = 'block';
    } catch (error) {
        console.error('Erro ao carregar detalhes:', error);
        showError('Falha ao carregar detalhes do personagem');
    } finally {
        showLoading(false);
    }
}

// Busca episódios do personagem
async function getEpisodes(episodeUrls) {
    try {
        const episodeIds = episodeUrls.map(url => url.split('/').pop()).join(',');
        const response = await fetch(`${API_URL}/episode/${episodeIds}`);
        const data = await response.json();
        
        return Array.isArray(data) ? data : [data];
    } catch (error) {
        console.error('Erro ao buscar episódios:', error);
        return [];
    }
}

// Mostra modal de favoritos
function showFavorites() {
    favGrid.innerHTML = '';
    
    if (favorites.length === 0) {
        favGrid.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-heart"></i>
                <h3>Nenhum favorito ainda</h3>
                <p>Adiciona personagens aos teus favoritos!</p>
            </div>
        `;
    } else {
        favorites.forEach(fav => {
            const card = document.createElement('div');
            card.className = 'character-card';
            
            card.innerHTML = `
                <img src="${fav.image}" alt="${fav.name}" class="character-image">
                <div class="character-info">
                    <h3 class="character-name">${fav.name}</h3>
                    <div class="character-status">
                        <span class="status-dot ${fav.status.toLowerCase()}"></span>
                        <span>${fav.status} - ${fav.species}</span>
                    </div>
                    <p class="character-species">${fav.location}</p>
                </div>
                <button class="favorite-btn favorited" 
                        onclick="removeFav(event, ${fav.id})">
                    <i class="fas fa-heart"></i>
                </button>
            `;
            
            favGrid.appendChild(card);
        });
    }
    
    favModal.style.display = 'block';
}

// Remove dos favoritos
function removeFav(event, charId) {
    event.stopPropagation();
    
    const favIndex = favorites.findIndex(fav => fav.id === charId);
    if (favIndex !== -1) {
        favorites.splice(favIndex, 1);
        localStorage.setItem('favorites', JSON.stringify(favorites));
        updateFavCount();
        
        // Atualiza modal de favoritos
        showFavorites();
        
        // Atualiza grid principal
        const card = document.querySelector(`[onclick*="${charId}"]`);
        if (card) {
            card.classList.remove('favorited');
        }
    }
}

// Lida com a busca
function search() {
    const term = searchInput.value.trim();
    const filters = getFilters();
    
    if (term) {
        filters.name = term;
    }
    
    currentPage = 1;
    loadCharacters(currentPage, filters);
}

// Lida com filtros
function applyFilters() {
    const filters = getFilters();
    currentPage = 1;
    loadCharacters(currentPage, filters);
}

// Pega filtros atuais
function getFilters() {
    const filters = {};
    
    if (statusFilter.value) filters.status = statusFilter.value;
    if (speciesFilter.value) filters.species = speciesFilter.value;
    
    return filters;
}

// Muda página
function goToPage(page) {
    if (page >= 1 && page <= totalPages) {
        const filters = getFilters();
        loadCharacters(page, filters);
    }
}

// Vai para página específica
function goToSpecificPage() {
    const page = parseInt(pageInput.value);
    if (page && page >= 1 && page <= totalPages) {
        goToPage(page);
        pageInput.value = '';
    } else {
        // Feedback visual de erro
        pageInput.style.borderColor = '#e74c3c';
        setTimeout(() => {
            pageInput.style.borderColor = 'rgba(255, 255, 255, 0.3)';
        }, 2000);
    }
}

// Atualiza paginação
function updatePagination() {
    pageInfo.textContent = `Página ${currentPage} de ${totalPages}`;
    prevBtn.disabled = currentPage === 1;
    nextBtn.disabled = currentPage === totalPages;
    
    // Atualiza placeholder do input
    pageInput.placeholder = `1-${totalPages}`;
    pageInput.max = totalPages;
}

// Mostra/esconde loading
function showLoading(show) {
    loadingEl.style.display = show ? 'flex' : 'none';
    grid.style.display = show ? 'none' : 'grid';
    paginationEl.style.display = show ? 'none' : 'flex';
}

// Fecha modais
function closeModals() {
    charModal.style.display = 'none';
    favModal.style.display = 'none';
}

// Mostra erro
function showError(message) {
    grid.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; color: white; padding: 2rem;">
            <h3>Erro</h3>
            <p>${message}</p>
        </div>
    `;
}

// Limpa busca
function clearSearch() {
    searchInput.value = '';
    statusFilter.value = '';
    speciesFilter.value = '';
    currentPage = 1;
    loadCharacters();
}

// Funções globais
window.toggleFav = toggleFav;
window.removeFav = removeFav;
