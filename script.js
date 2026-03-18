// CONFIGURAÇÃO DO SEU FIREBASE (Pegue no seu console Firebase)
const firebaseConfig = {
    apiKey: "SUA_API_KEY",
    authDomain: "barbearia-do-marcos.firebaseapp.com",
    databaseURL: "https://barbearia-do-marcos-default-rtdb.firebaseio.com",
    projectId: "barbearia-do-marcos",
    storageBucket: "barbearia-do-marcos.appspot.com",
    messagingSenderId: "894105389352",
    appId: "1:894105389352:web:3a5a27602c0d589581e81d"
};

// Inicializa Firebase
firebase.initializeApp(firebaseConfig);
const database = firebase.database();

// GERAÇÃO DINÂMICA DE HORÁRIOS
const listaHorarios = document.getElementById('lista-horarios');
const horariosDisponiveis = [
    "09:00", "10:00", "11:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00"
];

let horarioSelecionado = "";

function renderizarHorarios() {
    listaHorarios.innerHTML = ""; // Limpa a lista
    horariosDisponiveis.forEach(hora => {
        const btn = document.createElement('button');
        btn.type = "button";
        btn.classList.add('btn-horario');
        btn.innerText = hora;
        
        btn.onclick = () => {
            // Remove seleção de outros
            document.querySelectorAll('.btn-horario').forEach(b => b.classList.remove('selecionado'));
            // Adiciona seleção ao atual
            btn.classList.add('selecionado');
            horarioSelecionado = hora;
        };
        
        listaHorarios.appendChild(btn);
    });
}

// Chama a função ao carregar a página
renderizarHorarios();

// ENVIO PARA O BANCO DE DADOS
document.getElementById('form-agendamento').onsubmit = function(e) {
    e.preventDefault();

    if (!horarioSelecionado) {
        alert("Por favor, selecione um horário!");
        return;
    }

    const novoAgendamento = {
        cliente: document.getElementById('nome').value,
        whatsapp: document.getElementById('whatsapp').value,
        barbeiro: document.getElementById('barbeiro').value,
        servico: document.getElementById('servico').value,
        data: document.getElementById('data').value,
        horario: horarioSelecionado,
        status: "Pendente"
    };

    // Salva no Firebase
    database.ref('agendamentos').push(novoAgendamento)
        .then(() => {
            alert("Sucesso! Seu horário foi reservado.");
            window.location.href = "index.html";
        })
        .catch((error) => {
            console.error("Erro ao salvar:", error);
        });
};