// Verifica se tem alguém logado
auth.onAuthStateChanged(user => {
    if (user) {
        // Altera o título para dar boas vindas
        document.getElementById('boas-vindas').innerText = `Olá, ${user.email}`;
        
        // CHAMA A FUNÇÃO AGORA USANDO O UID (ID ÚNICO)
        carregarMeusAgendamentos(user.uid);
    } else {
        // Se não tiver logado, expulsa para o login
        window.location.href = "login.html";
    }
});

// FUNÇÃO ATUALIZADA: Agora recebe o "uid" no lugar do email
function carregarMeusAgendamentos(uid) {
    const container = document.getElementById('meus-agendamentos');
    
    // Busca no banco de dados usando o "cliente_uid"
    database.ref('agendamentos').orderByChild('cliente_uid').equalTo(uid).on('value', snapshot => {
        container.innerHTML = "";
        const data = snapshot.val();
        
        if (!data) {
            container.innerHTML = "<p style='color: var(--texto-cinza);'>Você ainda não tem agendamentos marcados.</p>";
            return;
        }

        // Transforma num array para mostrar os mais recentes primeiro
        const agendamentosArray = Object.keys(data).map(id => ({ id, ...data[id] })).reverse();

        agendamentosArray.forEach(ag => {
            const dataFormatada = ag.data.split('-').reverse().join('/');
            
            // Define a cor da etiqueta de status
            let corStatus = "var(--dourado)";
            if(ag.status === "Concluído") corStatus = "var(--sucesso)";
            if(ag.status === "Cancelado") corStatus = "var(--perigo)";

            const item = document.createElement('div');
            item.className = "card-item";
            item.style.padding = "25px";
            item.style.marginBottom = "15px";
            item.style.textAlign = "left";
            item.style.width = "100%";
            
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
                
                <a href="agendar.html" style="display: block; text-align: center; background: rgba(212, 175, 55, 0.1); border: 1px solid var(--dourado); color: var(--dourado); padding: 12px; border-radius: 8px; text-decoration: none; font-weight: bold; transition: 0.3s;">NOVO AGENDAMENTO</a>
            `;
            container.appendChild(item);
        });
    });
}

// Função do botão de Sair
function logout() {
    auth.signOut().then(() => {
        window.location.href = "index.html";
    });
}