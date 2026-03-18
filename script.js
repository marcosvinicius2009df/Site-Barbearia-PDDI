// CONFIGURAÇÃO DO FIREBASE
const firebaseConfig = {
    apiKey: "SUA_API_KEY",
    authDomain: "barbearia-do-marcos.firebaseapp.com",
    databaseURL: "https://barbearia-do-marcos-default-rtdb.firebaseio.com",
    projectId: "barbearia-do-marcos",
    storageBucket: "barbearia-do-marcos.appspot.com",
    messagingSenderId: "894105389352",
    appId: "1:894105389352:web:3a5a27602c0d589581e81d"
};

if (!firebase.apps.length) { firebase.initializeApp(firebaseConfig); }
const database = firebase.database();

// GERAÇÃO DOS HORÁRIOS
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
            document.querySelectorAll('.btn-horario').forEach(b => b.classList.remove('selecionado'));
            btn.classList.add('selecionado');
            horarioSelecionado = hora;
        };
        listaHorarios.appendChild(btn);
    });
}
renderizarHorarios();

// FORMULÁRIO DE AGENDAMENTO
const formAgendamento = document.getElementById('form-agendamento');
if (formAgendamento) {
    formAgendamento.onsubmit = function(e) {
        e.preventDefault();

        if (!horarioSelecionado) {
            alert("⚠️ Por favor, escolha um HORÁRIO antes de confirmar.");
            return;
        }

        const nome = document.getElementById('nome').value;
        const whatsappInput = document.getElementById('whatsapp').value;
        const dataCorte = document.getElementById('data').value;
        const selectServico = document.getElementById('servico');
        const servicoTexto = selectServico.options[selectServico.selectedIndex].text;

        // Limpeza e Formatação do Número (Assume Brasil 55 se tiver 11 dígitos)
        let numLimpo = whatsappInput.replace(/\D/g, "");
        if (numLimpo.length === 11) {
            numLimpo = "55" + numLimpo;
        } else if (numLimpo.length < 10) {
            alert("⚠️ O número de WhatsApp parece incompleto. Use DDD + Número.");
            return;
        }

        const novoAgendamento = {
            cliente: nome,
            whatsapp: numLimpo,
            barbeiro: document.getElementById('barbeiro').value,
            servico: servicoTexto,
            data: dataCorte,
            horario: horarioSelecionado,
            status: "Pendente",
            timestamp: Date.now()
        };

        // SALVAR NO FIREBASE
        database.ref('agendamentos').push(novoAgendamento)
            .then(() => {
                // Mensagem formatada para o cliente receber/enviar
                const msg = `✅ *AGENDAMENTO CONFIRMADO!*%0A%0AOlá *${nome}*, o seu horário na *Barbearia do Marquinhos* foi reservado com sucesso.%0A%0A✂️ *Serviço:* ${servicoTexto}%0A📅 *Data:* ${dataCorte}%0A⏰ *Hora:* ${horarioSelecionado}%0A%0A_Aguardamos por si!_`;
                
                // Abre o WhatsApp do cliente com o comprovante
                // Funciona em PC (App ou Web) e Telemóvel (iOS/Android)
                window.location.href = `https://api.whatsapp.com/send?phone=${numLimpo}&text=${msg}`;
            })
            .catch((error) => {
                console.error(error);
                alert("Erro ao salvar agendamento. Tente novamente.");
            });
    };
}