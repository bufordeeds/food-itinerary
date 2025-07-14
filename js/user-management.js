// User Management Functions
export function setupUserManagement() {
	const userName = localStorage.getItem('userName');
	if (!userName) {
		showUserNameModal();
	}

	// Set up input validation
	const userNameInput = document.getElementById('userNameInput');
	const saveBtn = document.getElementById('saveNameBtn');

	userNameInput.addEventListener('input', (e) => {
		const value = e.target.value.trim();
		saveBtn.disabled = value.length < 2;
	});

	userNameInput.addEventListener('keypress', (e) => {
		if (e.key === 'Enter' && !saveBtn.disabled) {
			saveUserName();
		}
	});
}

export function showUserNameModal() {
	const modal = document.getElementById('userNameModal');
	const input = document.getElementById('userNameInput');
	
	modal.style.display = 'flex';
	setTimeout(() => input.focus(), 300);
}

export function openUserNameModal() {
	const currentName = localStorage.getItem('userName');
	const input = document.getElementById('userNameInput');
	const h2 = document.querySelector('.user-name-content h2');
	const p = document.querySelector('.user-name-content p');
	
	if (currentName) {
		input.value = currentName;
		h2.textContent = 'Change Your Name';
		p.textContent = 'Update your name for meal planning coordination.';
	} else {
		input.value = '';
		h2.textContent = 'Welcome!';
		p.textContent = "What's your name? This helps others know who's planning what meals.";
	}
	
	showUserNameModal();
}

export function saveUserName() {
	const input = document.getElementById('userNameInput');
	const name = input.value.trim();
	
	if (name.length >= 2) {
		localStorage.setItem('userName', name);
		document.getElementById('userNameModal').style.display = 'none';
		
		// Show confirmation
		const statusText = document.getElementById('statusText');
		showSavingIndicator();
		statusText.textContent = `Welcome, ${name}!`;
		setTimeout(() => {
			statusText.textContent = 'Connected';
		}, 2000);
	}
}

export function getCurrentUserName() {
	return localStorage.getItem('userName') || 'Anonymous';
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