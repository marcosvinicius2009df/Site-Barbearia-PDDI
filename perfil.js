// CONFIGURAÇÃO FIREBASE 
const firebaseConfig = {
    apiKey: "AIzaSyDy1-E_o45AuAbfyzNd8Qg6qS-d-pCFExM",
    authDomain: "barbearia-do-marcos.firebaseapp.com",
    databaseURL: "https://barbearia-do-marcos-default-rtdb.firebaseio.com",
    projectId: "barbearia-do-marcos",
    storageBucket: "barbearia-do-marcos.firebasestorage.app",
    messagingSenderId: "894105389352",
    appId: "1:894105389352:web:3a5a27602c0d589581e81d",
    measurementId: "G-53GKXL29Z9"
};

// Evita erro de inicialização duplicada
if (!firebase.apps.length) { firebase.initializeApp(firebaseConfig); }
const auth = firebase.auth();
const database = firebase.database();

auth.onAuthStateChanged(user => {
    if (user) {
        document.getElementById('boas-vindas').innerText = `Olá, ${user.email}`;
        carregarMeusAgendamentos(user.email);
    } else {
        window.location.href = "login.html";
    }
});

function carregarMeusAgendamentos(email) {
    const container = document.getElementById('meus-agendamentos');
    
    // Procura no banco agendamentos que combinem com o email do login
    database.ref('agendamentos').orderByChild('cliente_email').equalTo(email).on('value', snapshot => {
        container.innerHTML = "";
        const data = snapshot.val();
        
        if (!data) {
            container.innerHTML = "<p>Ainda não tens agendamentos marcados.</p>";
            return;
        }

        Object.keys(data).forEach(id => {
            const ag = data[id];
            const item = document.createElement('div');
            item.className = "card-item";
            item.style.padding = "20px";
            item.style.marginBottom = "10px";
            item.innerHTML = `
                <h3 style="color: var(--dourado)">${ag.data} às ${ag.horario}</h3>
                <p><strong>Serviço:</strong> ${ag.servico}</p>
                <p><strong>Barbeiro:</strong> ${ag.barbeiro}</p>
                <p><strong>Status:</strong> <span style="color: ${ag.status === 'Pendente' ? '#d4af37' : '#25d366'}">${ag.status}</span></p>
            `;
            container.appendChild(item);
        });
    });
}

function logout() {
    auth.signOut().then(() => {
        window.location.href = "index.html";
    });
}