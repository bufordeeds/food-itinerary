import { database, getSessionId } from './firebase-config.js';

const EVENT_MEMBERS = ['Adrienne', 'AJ', 'Buford', 'Casey', 'Ikay', 'Keith', 'Larissa', 'Mark', 'RK', 'Zeke'];

const VENMO_USERNAMES = {
    'Adrienne': 'adriennelaggui',
    'AJ': 'Anthony-Laggui',
    'Buford': 'bufordeeds',
    'Casey': 'CaseyLizaso',
    'Ikay': 'ajoymeredith',
    'Keith': 'keith-meredith',
    'Larissa': 'larissacerpo',
    'Mark': 'marknicolas',
    'RK': 'Archelaus-Lizaso',
    'Zeke': 'Zeke-Nacional'
};

let editingExpenseId = null;
let expenses = {};

export function initializeExpenseManagement() {
    const sessionId = getSessionId();
    if (!sessionId) return;

    const expensesRef = database.ref(`sessions/${sessionId}/expenses`);

    expensesRef.on('value', (snapshot) => {
        expenses = snapshot.val() || {};
        renderExpenses();
        updateExpenseSummary();
    });

    setupExpenseModal();
}

function setupExpenseModal() {
    const modal = document.getElementById('expenseModal');
    const expenseAmount = document.getElementById('expenseAmount');
    const expensePaidBy = document.getElementById('expensePaidBy');
    const expenseVenmoUsername = document.getElementById('expenseVenmoUsername');
    
    if (expenseAmount) {
        expenseAmount.addEventListener('input', (e) => {
            const value = e.target.value.replace(/[^0-9.]/g, '');
            const parts = value.split('.');
            if (parts.length > 2) {
                e.target.value = parts[0] + '.' + parts.slice(1).join('');
            } else if (parts[1] && parts[1].length > 2) {
                e.target.value = parts[0] + '.' + parts[1].slice(0, 2);
            } else {
                e.target.value = value;
            }
        });
    }

    // Auto-fill Venmo username when "Paid By" is selected
    if (expensePaidBy && expenseVenmoUsername) {
        expensePaidBy.addEventListener('change', (e) => {
            const selectedPerson = e.target.value;
            if (selectedPerson && VENMO_USERNAMES[selectedPerson]) {
                expenseVenmoUsername.value = VENMO_USERNAMES[selectedPerson];
            }
        });
    }

    const splitTypeRadios = document.querySelectorAll('input[name="splitType"]');
    splitTypeRadios.forEach(radio => {
        radio.addEventListener('change', () => {
            const memberCheckboxes = document.getElementById('memberCheckboxes');
            if (radio.value === 'select') {
                memberCheckboxes.style.display = 'block';
            } else {
                memberCheckboxes.style.display = 'none';
            }
        });
    });
}

window.openAddExpenseModal = function() {
    editingExpenseId = null;
    document.getElementById('expenseModalTitle').textContent = 'Add Expense';
    document.getElementById('expenseForm').reset();
    document.getElementById('splitAll').checked = true;
    document.getElementById('memberCheckboxes').style.display = 'none';
    document.getElementById('saveExpenseBtn').textContent = 'Add Expense';
    document.getElementById('deleteExpenseBtn').style.display = 'none';
    document.getElementById('expenseModal').style.display = 'flex';
    lucide.createIcons();
};

window.openEditExpenseModal = function(expenseId) {
    const expense = expenses[expenseId];
    if (!expense) return;

    editingExpenseId = expenseId;
    document.getElementById('expenseModalTitle').textContent = 'Edit Expense';
    document.getElementById('expenseName').value = expense.name;
    document.getElementById('expenseAmount').value = expense.amount;
    document.getElementById('expensePaidBy').value = expense.paidBy;
    document.getElementById('expenseVenmoUsername').value = expense.venmoUsername || '';
    document.getElementById('expenseDescription').value = expense.description || '';

    if (expense.splitBetween === 'all') {
        document.getElementById('splitAll').checked = true;
        document.getElementById('memberCheckboxes').style.display = 'none';
    } else {
        document.getElementById('splitSelect').checked = true;
        document.getElementById('memberCheckboxes').style.display = 'block';
        
        document.querySelectorAll('.member-checkbox input').forEach(checkbox => {
            checkbox.checked = expense.splitBetween.includes(checkbox.value);
        });
    }

    document.getElementById('saveExpenseBtn').textContent = 'Update Expense';
    document.getElementById('deleteExpenseBtn').style.display = 'block';
    document.getElementById('expenseModal').style.display = 'flex';
    lucide.createIcons();
};

window.closeExpenseModal = function() {
    document.getElementById('expenseModal').style.display = 'none';
    editingExpenseId = null;
};

window.saveExpense = function(event) {
    event.preventDefault();

    const name = document.getElementById('expenseName').value.trim();
    const amount = parseFloat(document.getElementById('expenseAmount').value);
    const paidBy = document.getElementById('expensePaidBy').value;
    const venmoUsername = document.getElementById('expenseVenmoUsername').value.trim();
    const description = document.getElementById('expenseDescription').value.trim();
    const splitType = document.querySelector('input[name="splitType"]:checked').value;

    if (!name || !amount || !paidBy) {
        alert('Please fill in all required fields');
        return;
    }

    let splitBetween = 'all';
    if (splitType === 'select') {
        const selectedMembers = [];
        document.querySelectorAll('.member-checkbox input:checked').forEach(checkbox => {
            selectedMembers.push(checkbox.value);
        });
        
        if (selectedMembers.length === 0) {
            alert('Please select at least one member to split with');
            return;
        }
        splitBetween = selectedMembers;
    }

    const sessionId = getSessionId();
    
    const expenseData = {
        name,
        amount,
        paidBy,
        venmoUsername,
        description,
        splitBetween,
        timestamp: Date.now()
    };

    if (editingExpenseId) {
        database.ref(`sessions/${sessionId}/expenses/${editingExpenseId}`).set(expenseData);
    } else {
        const expenseId = Date.now().toString();
        database.ref(`sessions/${sessionId}/expenses/${expenseId}`).set(expenseData);
    }

    closeExpenseModal();
};

window.deleteExpense = function() {
    if (!editingExpenseId) return;
    
    if (confirm('Are you sure you want to delete this expense?')) {
        const sessionId = getSessionId();
        database.ref(`sessions/${sessionId}/expenses/${editingExpenseId}`).remove();
        closeExpenseModal();
    }
};

function renderExpenses() {
    const container = document.getElementById('expensesList');
    if (!container) return;

    const expenseArray = Object.entries(expenses).sort((a, b) => b[1].timestamp - a[1].timestamp);
    
    if (expenseArray.length === 0) {
        container.innerHTML = '<p class="no-expenses">No expenses added yet</p>';
        return;
    }

    container.innerHTML = expenseArray.map(([id, expense]) => {
        const splitText = expense.splitBetween === 'all' 
            ? 'Split between all members' 
            : `Split between ${expense.splitBetween.length} members`;
        
        const venmoButton = expense.venmoUsername 
            ? `<a href="https://account.venmo.com/u/${expense.venmoUsername}" target="_blank" class="venmo-link">
                 <i data-lucide="dollar-sign"></i> Pay on Venmo
               </a>`
            : '';

        return `
            <div class="expense-card">
                <div class="expense-header">
                    <h4>${expense.name}</h4>
                    <span class="expense-amount">$${expense.amount.toFixed(2)}</span>
                </div>
                <div class="expense-details">
                    <p><strong>Paid by:</strong> ${expense.paidBy}</p>
                    <p class="split-info">${splitText}</p>
                    ${expense.description ? `<p class="expense-description">${expense.description}</p>` : ''}
                </div>
                <div class="expense-actions">
                    ${venmoButton}
                    <button class="expense-btn edit" onclick="openEditExpenseModal('${id}')">
                        <i data-lucide="edit-2"></i> Edit
                    </button>
                </div>
            </div>
        `;
    }).join('');

    lucide.createIcons();
}

function updateExpenseSummary() {
    const container = document.getElementById('expenseSummary');
    if (!container) return;

    const balances = calculateBalances();
    const totalExpenses = Object.values(expenses).reduce((sum, expense) => sum + expense.amount, 0);
    
    const settlements = calculateSettlements(balances);
    
    let summaryHTML = `
        <div class="summary-header">
            <h4>Expense Summary</h4>
            <p class="total-amount">Total: $${totalExpenses.toFixed(2)}</p>
        </div>
    `;

    if (settlements.length > 0) {
        summaryHTML += '<div class="settlements">';
        summaryHTML += '<h5>Who Owes Who:</h5>';
        settlements.forEach(settlement => {
            summaryHTML += `<p class="settlement">${settlement.from} owes ${settlement.to} <strong>$${settlement.amount.toFixed(2)}</strong></p>`;
        });
        summaryHTML += '</div>';
    } else if (Object.keys(expenses).length > 0) {
        summaryHTML += '<p class="all-settled">All expenses are settled!</p>';
    }

    container.innerHTML = summaryHTML;
}

function calculateBalances() {
    const balances = {};
    EVENT_MEMBERS.forEach(member => balances[member] = 0);

    Object.values(expenses).forEach(expense => {
        balances[expense.paidBy] = (balances[expense.paidBy] || 0) + expense.amount;
        
        const splitMembers = expense.splitBetween === 'all' ? EVENT_MEMBERS : expense.splitBetween;
        const perPersonShare = expense.amount / splitMembers.length;
        
        splitMembers.forEach(member => {
            balances[member] = (balances[member] || 0) - perPersonShare;
        });
    });

    return balances;
}

function calculateSettlements(balances) {
    const settlements = [];
    const creditors = [];
    const debtors = [];

    Object.entries(balances).forEach(([member, balance]) => {
        if (balance > 0.01) {
            creditors.push({ member, amount: balance });
        } else if (balance < -0.01) {
            debtors.push({ member, amount: -balance });
        }
    });

    // Sort creditors and debtors by amount (largest first)
    creditors.sort((a, b) => b.amount - a.amount);
    debtors.sort((a, b) => b.amount - a.amount);

    // Create working copies to avoid modifying originals
    const workingCreditors = creditors.map(c => ({ ...c }));
    const workingDebtors = debtors.map(d => ({ ...d }));

    let i = 0, j = 0;
    while (i < workingCreditors.length && j < workingDebtors.length) {
        const creditor = workingCreditors[i];
        const debtor = workingDebtors[j];
        
        const settleAmount = Math.min(creditor.amount, debtor.amount);
        
        if (settleAmount > 0.01) {
            settlements.push({
                from: debtor.member,
                to: creditor.member,
                amount: settleAmount
            });
        }
        
        creditor.amount -= settleAmount;
        debtor.amount -= settleAmount;
        
        if (creditor.amount < 0.01) i++;
        if (debtor.amount < 0.01) j++;
    }

    return settlements;
}