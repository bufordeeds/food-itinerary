import { database, getSessionId } from './firebase-config.js';
import { setupUserManagement, saveUserName, openUserNameModal } from './user-management.js';
import { setupMealCards, openAddMealModal, closeMealModal, saveMeal, deleteMeal, openEditMealModal, deleteMealCard } from './meal-management.js';
import { initializeExpenseManagement } from './expense-management.js';

// Get session reference
const sessionId = getSessionId();
const sessionRef = database.ref(`sessions/${sessionId}`);

// Update share URL
document.getElementById('shareUrl').textContent = window.location.href;

// Status indicator elements
const statusDot = document.getElementById('statusDot');
const statusText = document.getElementById('statusText');
const activeUsersDiv = document.getElementById('activeUsers');
const userCountSpan = document.getElementById('userCount');

// Initialize app
function initializeApp() {
	setupConnectionStatus();
	setupRealtimeListeners();
	setupInputHandlers();
	setupMainTabs();
	setupMobileTabs();
	setupUserManagement();
	setupMealCards();
	initializeExpenseManagement();
}

function setupConnectionStatus() {
	// Connection state
	database.ref('.info/connected').on('value', (snapshot) => {
		if (snapshot.val() === true) {
			statusDot.classList.add('connected');
			statusText.textContent = 'Connected';

			// Add this user to presence list
			const userRef = sessionRef.child('presence').push();
			userRef.set(true);
			userRef.onDisconnect().remove();
		} else {
			statusDot.classList.remove('connected');
			statusText.textContent = 'Offline';
		}
	});

	// Monitor active users
	sessionRef.child('presence').on('value', (snapshot) => {
		const users = snapshot.val() || {};
		const userCount = Object.keys(users).length;

		if (userCount > 0) {
			activeUsersDiv.style.display = 'block';
			userCountSpan.textContent = userCount;
		} else {
			activeUsersDiv.style.display = 'none';
		}
	});
}

function setupRealtimeListeners() {
	// Trip info listeners
	sessionRef.child('eventName').on('value', (snapshot) => {
		const val = snapshot.val();
		if (val !== null && document.getElementById('eventName').value !== val) {
			document.getElementById('eventName').value = val;
		}
	});

	sessionRef.child('dates').on('value', (snapshot) => {
		const val = snapshot.val();
		if (val !== null && document.getElementById('groupSize').value !== val) {
			document.getElementById('groupSize').value = val;
		}
	});

	sessionRef.child('location').on('value', (snapshot) => {
		const val = snapshot.val();
		if (val !== null && document.getElementById('location').value !== val) {
			document.getElementById('location').value = val;
		}
	});

	// Schedule input listeners
	document.querySelectorAll('.schedule-input').forEach((input) => {
		const planId = input.getAttribute('data-plan');
		if (planId) {
			sessionRef.child(`plans/${planId}`).on('value', (snapshot) => {
				const val = snapshot.val();
				if (val !== null && input.value !== val) {
					input.value = val;
				}
			});
		}
	});

	document.querySelectorAll('.mobile-meal-input').forEach((input) => {
		const mealId = input.getAttribute('data-meal');
		const planId = input.getAttribute('data-plan');

		if (mealId) {
			sessionRef.child(`meals/${mealId}`).on('value', (snapshot) => {
				const val = snapshot.val();
				if (val !== null && input.value !== val) {
					input.value = val;
					syncToDesktopInput(mealId, val);
				}
			});
		} else if (planId) {
			sessionRef.child(`plans/${planId}`).on('value', (snapshot) => {
				const val = snapshot.val();
				if (val !== null && input.value !== val) {
					input.value = val;
				}
			});
		}
	});

	// Special notes listener
	sessionRef.child('specialNotes').on('value', (snapshot) => {
		const val = snapshot.val();
		const notesEl = document.getElementById('specialNotes');
		if (val !== null && notesEl.value !== val) {
			notesEl.value = val;
		}
	});
}

function setupInputHandlers() {
	// Debounce function
	function debounce(func, wait) {
		let timeout;
		return function executedFunction(...args) {
			const later = () => {
				clearTimeout(timeout);
				func(...args);
			};
			clearTimeout(timeout);
			timeout = setTimeout(later, wait);
		};
	}

	// Trip info inputs
	document.getElementById('eventName').addEventListener('input', debounce((e) => {
		sessionRef.child('eventName').set(e.target.value);
		showSavingIndicator();
	}, 500));

	document.getElementById('groupSize').addEventListener('input', debounce((e) => {
		sessionRef.child('dates').set(e.target.value);
		showSavingIndicator();
	}, 500));

	document.getElementById('location').addEventListener('input', debounce((e) => {
		sessionRef.child('location').set(e.target.value);
		showSavingIndicator();
	}, 500));

	// Schedule inputs
	document.querySelectorAll('.schedule-input').forEach((input) => {
		const planId = input.getAttribute('data-plan');
		if (planId) {
			input.addEventListener('input', debounce((e) => {
				sessionRef.child(`plans/${planId}`).set(e.target.value);
				showSavingIndicator();
			}, 500));
		}
	});

	// Mobile meal inputs
	document.querySelectorAll('.mobile-meal-input').forEach((input) => {
		const mealId = input.getAttribute('data-meal');
		const planId = input.getAttribute('data-plan');

		if (planId) {
			input.addEventListener('input', debounce((e) => {
				sessionRef.child(`plans/${planId}`).set(e.target.value);
				showSavingIndicator();
			}, 500));
		}
	});

	// Special notes
	document.getElementById('specialNotes').addEventListener('input', debounce((e) => {
		sessionRef.child('specialNotes').set(e.target.value);
		showSavingIndicator();
	}, 500));
}

function setupMainTabs() {
	const mainTabButtons = document.querySelectorAll('.main-tab-button');
	const tabContents = document.querySelectorAll('.tab-content');

	mainTabButtons.forEach((button) => {
		button.addEventListener('click', () => {
			const targetTab = button.getAttribute('data-tab');

			// Update active main tab
			mainTabButtons.forEach((btn) => btn.classList.remove('active'));
			button.classList.add('active');

			// Show corresponding tab content
			tabContents.forEach((content) => {
				content.classList.remove('active');
			});
			document.getElementById(`${targetTab}-content`).classList.add('active');
		});
	});
}

function setupMobileTabs() {
	// Setup both old tab-button and new day-tab-button classes
	const tabButtons = document.querySelectorAll('.tab-button, .day-tab-button');
	const dayContents = document.querySelectorAll('.day-content');

	tabButtons.forEach((button) => {
		button.addEventListener('click', () => {
			const targetDay = button.getAttribute('data-day');

			// Update active tab for both old and new button classes
			document.querySelectorAll('.tab-button, .day-tab-button').forEach((btn) => btn.classList.remove('active'));
			button.classList.add('active');

			// Show corresponding day content
			dayContents.forEach((content) => {
				content.style.display = 'none';
			});
			document.getElementById(`day-${targetDay}`).style.display = 'block';
		});
	});
}


function showSavingIndicator() {
	statusDot.classList.add('saving');
	statusText.textContent = 'Saving...';

	setTimeout(() => {
		statusDot.classList.remove('saving');
		statusText.textContent = 'Connected';
	}, 1000);
}

function copyShareUrl() {
	const shareUrl = window.location.href;
	navigator.clipboard.writeText(shareUrl).then(() => {
		const button = document.querySelector('.copy-button');
		const originalText = button.textContent;
		button.textContent = 'Copied!';
		setTimeout(() => {
			button.textContent = originalText;
		}, 2000);
	});
}

// Global functions for onclick handlers
window.copyShareUrl = copyShareUrl;
window.saveUserName = saveUserName;
window.openUserNameModal = openUserNameModal;
window.openAddMealModal = openAddMealModal;
window.closeMealModal = closeMealModal;
window.saveMeal = saveMeal;
window.deleteMeal = deleteMeal;
window.openEditMealModal = openEditMealModal;
window.deleteMealCard = deleteMealCard;

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
	initializeApp();
	// Initialize Lucide icons
	if (typeof lucide !== 'undefined') {
		lucide.createIcons();
	}
});