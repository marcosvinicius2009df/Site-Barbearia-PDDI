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
    
    database.ref('agendamentos').orderByChild('cliente_email').equalTo(email).on('value', snapshot => {
        container.innerHTML = "";
        const data = snapshot.val();
        
        if (!data) {
            container.innerHTML = "<p style='color: var(--texto-cinza);'>Ainda não tem agendamentos marcados.</p>";
            return;
        }

        // Transforma num array para mostrar os mais recentes primeiro
        const agendamentosArray = Object.keys(data).map(id => ({ id, ...data[id] })).reverse();

        agendamentosArray.forEach(ag => {
            const dataFormatada = ag.data.split('-').reverse().join('/');
            const item = document.createElement('div');
            item.className = "card-item";
            item.style.padding = "25px";
            item.style.marginBottom = "15px";
            item.style.textAlign = "left";
            item.style.width = "100%";
            
            // Lógica de cores baseada no status
            const corStatus = ag.status === 'Pendente' ? 'var(--dourado)' : 'var(--sucesso)';
            
            // Criamos a URL para passar os dados para o agendar.html
            const servicoPuro = ag.servico.split(' + ')[0]; // Tira a pomada se tiver
            
            item.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: start; border-bottom: 1px solid var(--borda); padding-bottom: 15px; margin-bottom: 15px;">
                    <div>
                        <h3 style="color: var(--branco); font-size: 1.2rem; margin-bottom: 5px;">📅 ${dataFormatada} às ${ag.horario}</h3>
                        <p style="color: var(--texto-cinza); font-size: 0.9rem;"><strong>Barbeiro:</strong> ${ag.barbeiro}</p>
                    </div>
                    <span style="background: rgba(255,255,255,0.05); border: 1px solid ${corStatus}; color: ${corStatus}; padding: 5px 12px; border-radius: 50px; font-size: 0.8rem; font-weight: bold;">
                        ${ag.status}
                    </span>
                </div>
                <p style="color: var(--branco); font-weight: 500; margin-bottom: 20px;">✂️ ${ag.servico}</p>
                
                <a href="agendar.html" style="display: block; text-align: center; background: rgba(212, 175, 55, 0.1); border: 1px solid var(--dourado); color: var(--dourado); padding: 12px; border-radius: 8px; text-decoration: none; font-weight: bold; transition: 0.3s;" onmouseover="this.style.background='var(--dourado)'; this.style.color='#000';" onmouseout="this.style.background='rgba(212, 175, 55, 0.1)'; this.style.color='var(--dourado)';">
                    ↻ REPETIR ESTE CORTE
                </a>
            `;
            container.appendChild(item);
        });
    });
}