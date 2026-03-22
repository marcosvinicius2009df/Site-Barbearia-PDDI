// ==========================================
// 1. CONFIGURAÇÃO DO FIREBASE BLINDADA
// ==========================================
// Mudamos o nome da variável para não dar conflito com o agendar.html
const configDoScript = {
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
if (!firebase.apps.length) { 
    firebase.initializeApp(configDoScript); 
}
const database = firebase.database();
const auth = firebase.auth();

// ==========================================
// 2. MUDANÇAS NO MENU & AUTO-PREENCHIMENTO
// ==========================================
auth.onAuthStateChanged(user => {
    const navConta = document.getElementById('nav-conta');
    const navLogout = document.getElementById('nav-logout');

    if (user) {
        // ---- O USUÁRIO ESTÁ LOGADO ----
        if (navConta) {
            navConta.innerText = "Meu Perfil";
            navConta.href = "perfil.html";
            navConta.style.color = "var(--dourado)";
        }
        if (navLogout) {
            navLogout.style.display = "block";
        }

        // Preenche os dados na página de agendamento automaticamente
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
        window.location.reload(); 
    });
};

// ==========================================
// 3. MENU HAMBÚRGUER (MOBILE)
// ==========================================
const menuToggle = document.getElementById('mobile-menu');
const navLinks = document.querySelector('.nav-links');
const itensDoMenu = document.querySelectorAll('.nav-links li a'); 

if (menuToggle) {
    menuToggle.addEventListener('click', () => {
        navLinks.classList.toggle('active'); 
    });
}

// Fecha o painel escuro quando clica em algum link
itensDoMenu.forEach(link => {
    link.addEventListener('click', () => {
        if(navLinks) navLinks.classList.remove('active');
    });
});

// ==========================================
// 4. GERAÇÃO INTELIGENTE DE HORÁRIOS
// ==========================================
const listaHorarios = document.getElementById('lista-horarios');
const horariosDisponiveis = ["09:00", "10:00", "11:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00"];
let horarioSelecionado = "";

function buscarHorariosOcupados() {
    if (!listaHorarios) return;
    
    const dataEscolhida = document.getElementById('data')?.value;
    const barbeiroEscolhido = document.getElementById('barbeiro')?.value;

    // Pede para escolher a data primeiro
    if (!dataEscolhida) {
        listaHorarios.innerHTML = "<p style='color: var(--dourado); grid-column: span 3; text-align: center; font-size: 0.9rem; padding: 15px 0;'>📅 Por favor, escolha uma data acima para ver os horários livres.</p>";
        return;
    }

    listaHorarios.innerHTML = "<p style='color: var(--texto-cinza); grid-column: span 3; text-align: center;'>Consultando agenda...</p>";

    // Puxa do banco
    database.ref('agendamentos').once('value').then(snapshot => {
        const agendamentos = snapshot.val();
        let horariosOcupados = [];

        if (agendamentos) {
            Object.values(agendamentos).forEach(ag => {
                if (ag.data === dataEscolhida && ag.barbeiro === barbeiroEscolhido) {
                    horariosOcupados.push(ag.horario);
                }
            });
        }
        
        renderizarHorarios(horariosOcupados);
    }).catch(error => {
        console.error("Erro na busca: ", error);
        renderizarHorarios([]); 
    });
}

function renderizarHorarios(horariosOcupados = []) {
    if (!listaHorarios) return;
    listaHorarios.innerHTML = "";
    horarioSelecionado = ""; 

    horariosDisponiveis.forEach(hora => {
        const btn = document.createElement('button');
        btn.type = "button";
        btn.className = "btn-horario";
        
        if (horariosOcupados.includes(hora)) {
            // BLOQUEADO
            btn.innerText = hora + " (Ocupado)";
            btn.disabled = true;
            btn.style.opacity = "0.2";
            btn.style.cursor = "not-allowed";
            btn.style.background = "transparent";
            btn.style.borderColor = "rgba(255, 255, 255, 0.05)";
            btn.style.color = "var(--texto-cinza)";
        } else {
            // LIVRE
            btn.innerText = hora;
            btn.onclick = () => {
                document.querySelectorAll('.btn-horario:not([disabled])').forEach(b => {
                    b.style.backgroundColor = 'rgba(255, 255, 255, 0.02)';
                    b.style.color = 'var(--texto-cinza)';
                    b.style.borderColor = 'rgba(255, 255, 255, 0.05)';
                });
                btn.style.backgroundColor = 'rgba(212, 175, 55, 0.1)';
                btn.style.color = 'var(--dourado)';
                btn.style.borderColor = 'var(--dourado)';
                horarioSelecionado = hora;
            };
        }
        listaHorarios.appendChild(btn);
    });
}

// Ouve as mudanças de data e barbeiro
const inputData = document.getElementById('data');
const selectBarbeiro = document.getElementById('barbeiro');

if (inputData) inputData.addEventListener('change', buscarHorariosOcupados);
if (selectBarbeiro) selectBarbeiro.addEventListener('change', buscarHorariosOcupados);

if (listaHorarios) buscarHorariosOcupados();

// ==========================================
// 5. ENVIO DO AGENDAMENTO
// ==========================================
const formAgendamento = document.getElementById('form-agendamento');
if (formAgendamento) {
    formAgendamento.onsubmit = (e) => {
        e.preventDefault();

        if (!horarioSelecionado) {
            alert("⚠️ Por favor, escolha um horário.");
            // Reativa o botão se ele não escolheu o horário
            const btn = document.getElementById('btn-submit-agendar');
            if(btn) {
                btn.innerText = "CONFIRMAR AGENDAMENTO";
                btn.style.opacity = "1";
                btn.style.pointerEvents = "auto";
            }
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
            .catch(error => {
                alert("Erro ao agendar: " + error.message);
                const btn = document.getElementById('btn-submit-agendar');
                if(btn) {
                    btn.innerText = "CONFIRMAR AGENDAMENTO";
                    btn.style.opacity = "1";
                    btn.style.pointerEvents = "auto";
                }
            });
    };
}