import { database, getSessionId, generateMealId } from './firebase-config.js';
import { getCurrentUserName } from './user-management.js';

const EVENT_MEMBERS = ['Adrienne', 'AJ', 'Buford', 'Casey', 'Ikay', 'Keith', 'Larissa', 'Mark', 'RK', 'Zeke'];

// Meal Management Functions
let currentMealSlot = null;
let currentMealId = null;
let isEditMode = false;
const sessionRef = database.ref(`sessions/${getSessionId()}`);

export function setupMealCards() {
	// Listen for meal changes in Firebase
	sessionRef.child('meals').on('value', (snapshot) => {
		const meals = snapshot.val() || {};
		renderMealCards(meals);
	});
}

export function openAddMealModal(mealSlot) {
	currentMealSlot = mealSlot;
	currentMealId = null;
	isEditMode = false;
	
	// Reset form
	document.getElementById('mealForm').reset();
	document.getElementById('mealModalTitle').textContent = 'Add Meal';
	document.querySelector('.meal-form-actions').style.display = 'flex';
	document.getElementById('editActions').style.display = 'none';
	
	// Show modal
	document.getElementById('mealModal').style.display = 'flex';
	setTimeout(() => document.getElementById('mealName').focus(), 300);
}

export function openEditMealModal(mealId, mealData) {
	currentMealSlot = mealData.slot;
	currentMealId = mealId;
	isEditMode = true;
	
	// Populate form
	document.getElementById('mealName').value = mealData.name || '';
	document.getElementById('mealDescription').value = mealData.description || '';
	document.getElementById('mealRecipeLink').value = mealData.recipeLink || '';
	document.getElementById('mealClaimedBy').value = mealData.claimedBy || '';
	
	// Update modal title and actions
	document.getElementById('mealModalTitle').textContent = 'Edit Meal';
	document.querySelector('.meal-form-actions').style.display = 'none';
	document.getElementById('editActions').style.display = 'flex';
	
	// Show modal
	document.getElementById('mealModal').style.display = 'flex';
	setTimeout(() => document.getElementById('mealName').focus(), 300);
}

export function closeMealModal() {
	document.getElementById('mealModal').style.display = 'none';
	currentMealSlot = null;
	currentMealId = null;
	isEditMode = false;
}

export function saveMeal(event) {
	event.preventDefault();
	
	const mealName = document.getElementById('mealName').value.trim();
	const mealDescription = document.getElementById('mealDescription').value.trim();
	const mealRecipeLink = document.getElementById('mealRecipeLink').value.trim();
	const mealClaimedBy = document.getElementById('mealClaimedBy').value;
	
	if (!mealName) {
		alert('Please enter a meal name');
		return;
	}
	
	// Validate recipe link if provided
	if (mealRecipeLink && !isValidURL(mealRecipeLink)) {
		alert('Please enter a valid URL for the recipe link');
		return;
	}
	
	const mealData = {
		name: mealName,
		description: mealDescription,
		recipeLink: mealRecipeLink,
		addedBy: getCurrentUserName(),
		claimedBy: mealClaimedBy,
		slot: currentMealSlot,
		timestamp: Date.now()
	};
	
	// If editing, keep the original claimer
	if (isEditMode && currentMealId) {
		// We'll need to get the existing claimer from Firebase
		saveMealToFirebase(currentMealId, mealData, true);
	} else {
		// Generate new meal ID
		const mealId = generateMealId();
		saveMealToFirebase(mealId, mealData, false);
	}
}

export function deleteMeal() {
	if (confirm('Are you sure you want to delete this meal?')) {
		if (currentMealId) {
			sessionRef.child(`meals/${currentMealId}`).remove()
				.then(() => {
					closeMealModal();
					showSavingIndicator();
				})
				.catch((error) => {
					alert('Error deleting meal: ' + error.message);
				});
		}
	}
}

function saveMealToFirebase(mealId, mealData, isUpdate) {
	sessionRef.child(`meals/${mealId}`).set(mealData)
		.then(() => {
			closeMealModal();
			showSavingIndicator();
			const statusText = document.getElementById('statusText');
			statusText.textContent = isUpdate ? 'Meal updated!' : 'Meal added!';
			setTimeout(() => {
				statusText.textContent = 'Connected';
			}, 2000);
		})
		.catch((error) => {
			alert('Error saving meal: ' + error.message);
		});
}

function isValidURL(string) {
	try {
		new URL(string);
		return true;
	} catch (_) {
		return false;
	}
}

function renderMealCards(meals) {
	// Clear all meal containers
	document.querySelectorAll('.meal-cards-container').forEach(container => {
		const mealSlot = container.getAttribute('data-meal-slot');
		const addBtn = container.querySelector('.add-meal-btn');
		
		// Clear existing cards but keep add button
		container.innerHTML = '';
		container.appendChild(addBtn);
	});

	// Render meal cards
	Object.entries(meals).forEach(([mealId, mealData]) => {
		const container = document.querySelector(`[data-meal-slot="${mealData.slot}"]`);
		if (container) {
			const mealCard = createMealCard(mealId, mealData);
			container.insertBefore(mealCard, container.querySelector('.add-meal-btn'));
		}
	});
}

function createMealCard(mealId, mealData) {
	const currentUser = getCurrentUserName();
	const isClaimed = mealData.claimedBy && mealData.claimedBy !== '';
	const isClaimedByMe = mealData.claimedBy === currentUser;

	const card = document.createElement('div');
	card.className = `meal-card ${isClaimed ? 'claimed' : ''}`;
	
	let recipeLink = '';
	if (mealData.recipeLink) {
		recipeLink = `<a href="${mealData.recipeLink}" target="_blank" class="meal-recipe-link"><i data-lucide="external-link"></i> Recipe</a>`;
	}

	// Allow anyone to edit/delete any meal
	const editButton = `
		<button class="meal-btn edit" onclick="openEditMealModal('${mealId}', ${JSON.stringify(mealData).replace(/"/g, '&quot;')})" title="Edit meal"><i data-lucide="edit"></i></button>
		<button class="meal-btn delete" onclick="deleteMealCard('${mealId}')" title="Delete meal"><i data-lucide="trash-2"></i></button>
	`;

	card.innerHTML = `
		<div class="meal-card-header">
			<h3 class="meal-name">${mealData.name}</h3>
			<div class="meal-actions">
				${editButton}
			</div>
		</div>
		${mealData.description ? `<div class="meal-description">${mealData.description}</div>` : ''}
		<div class="meal-meta">
			<div>
				<span class="meal-creator">Added by ${mealData.addedBy || mealData.createdBy}</span>
				${isClaimed ? `<br><span class="meal-claimer"><i data-lucide="user-check"></i> ${mealData.claimedBy} is handling this</span>` : '<br><span class="meal-unclaimed">No one assigned yet</span>'}
			</div>
			${recipeLink}
		</div>
	`;

	// Add click event to card for editing
	card.addEventListener('click', (e) => {
		// Don't trigger if clicking on buttons or links
		if (e.target.tagName === 'BUTTON' || e.target.tagName === 'A' || e.target.closest('button') || e.target.closest('a')) {
			return;
		}
		openEditMealModal(mealId, mealData);
	});

	// Add cursor pointer to indicate clickable
	card.style.cursor = 'pointer';

	// Initialize Lucide icons for this card
	setTimeout(() => {
		if (typeof lucide !== 'undefined') {
			lucide.createIcons();
		}
	}, 0);

	return card;
}


export function deleteMealCard(mealId) {
	if (confirm('Are you sure you want to delete this meal?')) {
		sessionRef.child(`meals/${mealId}`).remove()
			.then(() => {
				showSavingIndicator();
				const statusText = document.getElementById('statusText');
				statusText.textContent = 'Meal deleted!';
				setTimeout(() => {
					statusText.textContent = 'Connected';
				}, 2000);
			})
			.catch((error) => {
				alert('Error deleting meal: ' + error.message);
			});
	}
}

function showSavingIndicator() {
	const statusDot = document.getElementById('statusDot');
	const statusText = document.getElementById('statusText');
	
	statusDot.classList.add('saving');
	statusText.textContent = 'Saving...';

	setTimeout(() => {
		statusDot.classList.remove('saving');
		statusText.textContent = 'Connected';
	}, 1000);
}