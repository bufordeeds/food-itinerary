// Firebase configuration and initialization
const firebaseConfig = {
	apiKey: 'AIzaSyCCvC9SA8gHcG7jStN8RKUhh8_wIJlwimk',
	authDomain: 'dev-projects-28948.firebaseapp.com',
	databaseURL: 'https://dev-projects-28948-default-rtdb.firebaseio.com',
	projectId: 'dev-projects-28948',
	storageBucket: 'dev-projects-28948.firebasestorage.app',
	messagingSenderId: '609771874067',
	appId: '1:609771874067:web:ec83a9df9633a68e139ce6'
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
export const database = firebase.database();

// Session management
export function getSessionId() {
	let sessionId = new URLSearchParams(window.location.search).get('session');
	if (!sessionId) {
		sessionId = generateSessionId();
		window.history.replaceState({}, '', `?session=${sessionId}`);
	}
	return sessionId;
}

export function generateSessionId() {
	return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

export function generateMealId() {
	return `meal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}