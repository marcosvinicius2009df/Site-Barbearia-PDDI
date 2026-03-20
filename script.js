// 1. CONFIGURAÇÃO DO FIREBASE
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

// Inicialização segura
if (!firebase.apps.length) { firebase.initializeApp(firebaseConfig); }
const database = firebase.database();
const auth = firebase.auth();

// ==========================================
// MUDANÇAS NO MENU & AUTO-PREENCHIMENTO
// ==========================================
auth.onAuthStateChanged(user => {
    const navConta = document.getElementById('nav-conta');
    const navLogout = document.getElementById('nav-logout');

    if (user) {
        // ---- O USUÁRIO ESTÁ LOGADO ----
        
        // 1. Muda o menu da página inicial
        if (navConta) {
            navConta.innerText = "Meu Perfil";
            navConta.href = "perfil.html";
            navConta.style.color = "var(--dourado)";
        }
        if (navLogout) {
            navLogout.style.display = "block";
        }

        // 2. Preenche os dados na página de agendamento (se estiver nela)
        database.ref('clientes/' + user.uid).once('value').then(snapshot => {
            const dadosCliente = snapshot.val();
            if (dadosCliente) {
                const campoNome = document.getElementById('nome');
                const campoZap = document.getElementById('whatsapp');

                if (campoNome && campoZap) {
                    campoNome.value = dadosCliente.nome;
                    campoZap.value = dadosCliente.whatsapp;
                    campoNome.readOnly = true;
                    campoZap.readOnly = true;
                    campoNome.style.opacity = "0.7";
                    campoZap.style.opacity = "0.7";
                }
            }
        });
    } else {
        // ---- O USUÁRIO NÃO ESTÁ LOGADO ----
        if (navConta) {
            navConta.innerText = "Minha Conta";
            navConta.href = "login.html";
        }
        if (navLogout) {
            navLogout.style.display = "none";
        }
    }
});

// Função para o botão "Sair" do menu
window.fazerLogout = function() {
    auth.signOut().then(() => {
        window.location.reload(); // Recarrega a página após sair
    });
};

// ==========================================
// MENU HAMBÚRGUER (MOBILE)
// ==========================================
const menuToggle = document.getElementById('mobile-menu');
const navLinks = document.querySelector('.nav-links');

if (menuToggle) {
    menuToggle.addEventListener('click', () => {
        navLinks.classList.toggle('active'); 
    });
}

// ==========================================
// GERAÇÃO DOS HORÁRIOS (Para agendar.html)
// ==========================================
const listaHorarios = document.getElementById('lista-horarios');
const horariosDisponiveis = ["09:00", "10:00", "11:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00"];
let horarioSelecionado = "";

function renderizarHorarios() {
    if (!listaHorarios) return;
    listaHorarios.innerHTML = "";
    horariosDisponiveis.forEach(hora => {
        const btn = document.createElement('button');
        btn.type = "button";
        btn.className = "btn-horario";
        btn.innerText = hora;
        btn.onclick = () => {
            document.querySelectorAll('.btn-horario').forEach(b => {
                b.style.backgroundColor = 'var(--bg-input)';
                b.style.color = 'var(--branco)';
            });
            btn.style.backgroundColor = 'var(--dourado)';
            btn.style.color = 'var(--bg-fundo)';
            horarioSelecionado = hora;
        };
        listaHorarios.appendChild(btn);
    });
}
renderizarHorarios();

// ==========================================
// ENVIO DO AGENDAMENTO (Para agendar.html)
// ==========================================
const formAgendamento = document.getElementById('form-agendamento');
if (formAgendamento) {
    formAgendamento.onsubmit = (e) => {
        e.preventDefault();

        if (!horarioSelecionado) {
            alert("⚠️ Por favor, escolha um horário.");
            return;
        }

        const nome = document.getElementById('nome').value;
        const whatsapp = document.getElementById('whatsapp').value;
        const servicoSelect = document.getElementById('servico');
        const servicoTexto = servicoSelect.options[servicoSelect.selectedIndex].text;
        const dataCorte = document.getElementById('data').value;
        const barbeiro = document.getElementById('barbeiro').value;

        let numLimpo = whatsapp.replace(/\D/g, "");
        if (numLimpo.length === 11) { numLimpo = "55" + numLimpo; }

        const novoAgendamento = {
            cliente: nome,
            whatsapp: numLimpo,
            barbeiro: barbeiro,
            servico: servicoTexto,
            data: dataCorte,
            horario: horarioSelecionado,
            status: "Pendente",
            timestamp: Date.now()
        };

        if (auth.currentUser) {
            novoAgendamento.cliente_email = auth.currentUser.email;
        }

        database.ref('agendamentos').push(novoAgendamento)
            .then(() => {
                const msg = `✅ *AGENDAMENTO CONFIRMADO!*%0A%0AOlá *${nome}*, seu horário na *Barbearia do Marquinhos* foi reservado.%0A%0A✂️ *Serviço:* ${servicoTexto}%0A📅 *Data:* ${dataCorte}%0A⏰ *Hora:* ${horarioSelecionado}%0A👤 *Barbeiro:* ${barbeiro}`;
                const seuNumeroFixo = "5561999999999"; 
                window.location.href = `https://api.whatsapp.com/send?phone=${seuNumeroFixo}&text=${msg}`;
            })
            .catch(error => alert("Erro ao agendar: " + error.message));
    };
}