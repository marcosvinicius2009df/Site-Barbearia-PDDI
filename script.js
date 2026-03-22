// ==========================================
// 1. CONFIGURAÇÃO DO FIREBASE BLINDADA
// ==========================================
const configDoScript = {
    apiKey: "AIzaSyDy1-E_o45AuAbfyzNd8Qg6qS-d-pCFExM",
    authDomain: "barbearia-do-marcos.firebaseapp.com",
    databaseURL: "https://barbearia-do-marcos-default-rtdb.firebaseio.com",
    projectId: "barbearia-do-marcos"
};

if (!firebase.apps.length) { firebase.initializeApp(configDoScript); }
const database = firebase.database();
const auth = firebase.auth();

// ==========================================
// 2. MUDANÇAS NO MENU & AUTO-PREENCHIMENTO
// ==========================================
auth.onAuthStateChanged(user => {
    const navConta = document.getElementById('nav-conta');
    const navLogout = document.getElementById('nav-logout');

    if (user) {
        if (navConta) {
            navConta.innerText = "Meu Perfil";
            navConta.href = "perfil.html";
        }
        if (navLogout) navLogout.style.display = "inline-block";

        database.ref('clientes/' + user.uid).once('value').then(snapshot => {
            const dados = snapshot.val();
            if (dados) {
                const inputNome = document.getElementById('nome');
                const inputZap = document.getElementById('whatsapp');
                if (inputNome) { inputNome.value = dados.nome; inputNome.readOnly = true; }
                if (inputZap) { inputZap.value = dados.whatsapp; inputZap.readOnly = true; }
            }
        });
    } else {
        if (navConta) { navConta.innerText = "Minha Conta"; navConta.href = "login.html"; }
        if (navLogout) navLogout.style.display = "none";
    }
});

function fazerLogout() {
    auth.signOut().then(() => {
        window.location.href = "index.html";
    }).catch(error => {
        alert("Erro ao sair: " + error.message);
    });
}

// ==========================================
// 3. MENU MOBILE RESPONSIVO
// ==========================================
const menuToggle = document.getElementById('mobile-menu');
const navLinks = document.querySelector('.nav-links');
if(menuToggle && navLinks) {
    menuToggle.addEventListener('click', () => { navLinks.classList.toggle('active'); });
}

// ==========================================
// 4. MOTOR INTELIGENTE (BARBEIROS E HORÁRIOS)
// ==========================================
const listaHorarios = document.getElementById('lista-horarios');
const selectBarbeiro = document.getElementById('barbeiro');
const inputData = document.getElementById('data');
const horariosDisponiveis = ["09:00", "10:00", "11:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00"];
let horarioSelecionado = "";

if (selectBarbeiro) {
    database.ref('barbeiros').on('value', snap => {
        selectBarbeiro.innerHTML = "";
        if (!snap.exists()) {
            selectBarbeiro.innerHTML = "<option value=''>Sem barbeiros disponíveis</option>";
            return;
        }
        snap.forEach(child => {
            const opt = document.createElement('option');
            opt.value = child.val().nome;
            opt.innerText = child.val().nome;
            selectBarbeiro.appendChild(opt);
        });
        buscarHorariosOcupados();
    });
}

function buscarHorariosOcupados() {
    if (!listaHorarios) return;
    
    const dataEscolhida = inputData?.value;
    const barbeiroEscolhido = selectBarbeiro?.value;

    if (!dataEscolhida) {
        listaHorarios.innerHTML = "<p style='color: var(--dourado); grid-column: span 3; text-align: center; font-size: 0.9rem; padding: 15px 0;'>📅 Escolha uma data para ver os horários.</p>";
        return;
    }

    listaHorarios.innerHTML = "<p style='color: var(--texto-cinza); grid-column: span 3; text-align: center;'>A verificar disponibilidade...</p>";

    database.ref('bloqueios').orderByChild('data').equalTo(dataEscolhida).once('value').then(snapBloqueio => {
        if (snapBloqueio.exists()) {
            listaHorarios.innerHTML = "<p style='color: var(--perigo); grid-column: span 3; text-align: center; font-weight: bold;'>❌ Estabelecimento Fechado neste dia.</p>";
            return;
        }

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
        });
    });
}

function renderizarHorarios(horariosOcupados = []) {
    listaHorarios.innerHTML = "";
    horarioSelecionado = ""; 

    horariosDisponiveis.forEach(hora => {
        const btn = document.createElement('button');
        btn.type = "button";
        btn.className = "btn-horario";
        
        if (horariosOcupados.includes(hora)) {
            btn.innerText = hora + " (Ocupado)";
            btn.disabled = true;
            btn.style.opacity = "0.2";
            btn.style.cursor = "not-allowed";
        } else {
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

if (inputData) inputData.addEventListener('change', buscarHorariosOcupados);
if (selectBarbeiro) selectBarbeiro.addEventListener('change', buscarHorariosOcupados);

// ==========================================
// 5. ENVIO DO AGENDAMENTO (COM UPSELL)
// ==========================================
const formAgendamento = document.getElementById('form-agendamento');
if (formAgendamento) {
    formAgendamento.onsubmit = (e) => {
        e.preventDefault();

        if (!horarioSelecionado) {
            alert("⚠️ Por favor, escolha um horário.");
            const btn = document.getElementById('btn-submit-agendar');
            if(btn) { btn.innerText = "CONFIRMAR AGENDAMENTO"; btn.style.opacity = "1"; btn.style.pointerEvents = "auto"; }
            return;
        }

        const nome = document.getElementById('nome').value;
        const whatsapp = document.getElementById('whatsapp').value;
        const servicoSelect = document.getElementById('servico');
        let servicoTexto = servicoSelect.options[servicoSelect.selectedIndex].text;
        const dataCorte = document.getElementById('data').value;
        const barbeiro = document.getElementById('barbeiro').value;

        const upsellPomada = document.getElementById('upsell-pomada');
        if(upsellPomada && upsellPomada.checked) {
            servicoTexto += " + 📦 Pomada Matte (R$ 45,00)";
        }

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

        if (auth.currentUser) { novoAgendamento.cliente_email = auth.currentUser.email; }

        database.ref('agendamentos').push(novoAgendamento)
            .then(() => {
                const msg = `✅ *AGENDAMENTO CONFIRMADO!*%0A%0AOlá *${nome}*, o seu horário na *Barbearia do Marquinhos* foi reservado.%0A%0A✂️ *Serviço:* ${servicoTexto}%0A📅 *Data:* ${dataCorte.split('-').reverse().join('/')}%0A⏰ *Hora:* ${horarioSelecionado}%0A👤 *Barbeiro:* ${barbeiro}`;
                const seuNumeroFixo = "5561999999999"; 
                window.location.href = `https://api.whatsapp.com/send?phone=${seuNumeroFixo}&text=${msg}`;
            })
            .catch(error => alert("Erro ao agendar: " + error.message));
    };
}

// ==========================================
// 6. LISTA DE ESPERA E AVALIAÇÕES (FASE 3)
// ==========================================
window.entrarListaEspera = function() {
    const nome = document.getElementById('nome')?.value;
    const zap = document.getElementById('whatsapp')?.value;
    const dataCorte = document.getElementById('data')?.value;

    if(!nome || !zap || !dataCorte) {
        return alert("⚠️ Por favor, escolha a data e veja se o seu nome e WhatsApp estão preenchidos acima.");
    }

    let numLimpo = zap.replace(/\D/g, "");
    if (numLimpo.length === 11) { numLimpo = "55" + numLimpo; }

    database.ref('lista_espera').push({
        cliente: nome, whatsapp: numLimpo, data: dataCorte, timestamp: Date.now()
    }).then(() => {
        alert("✅ Entrou na Lista de Espera! Se vagar um horário, nós te avisaremos no WhatsApp.");
    });
};

// Preparação para chamar no perfil futuramente
window.enviarAvaliacao = function(nota, comentario) {
    if(!auth.currentUser) return alert("Precisa fazer login para avaliar.");
    const nome = document.getElementById('nome')?.value || "Cliente";
    database.ref('avaliacoes').push({
        cliente: nome, nota: nota, comentario: comentario, data: new Date().toISOString().split('T')[0]
    }).then(() => alert("Obrigado pela sua avaliação!"));
};