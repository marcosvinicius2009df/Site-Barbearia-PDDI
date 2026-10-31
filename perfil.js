/* Perfil do cliente — renderização segura sem interpolar dados do banco em HTML. */
function texto(tag, valor, classe) { const el = document.createElement(tag); el.textContent = String(valor ?? ''); if (classe) el.className = classe; return el; }
function mostrarAvisoPerfil(mensagem) { const el = texto('p', mensagem); el.setAttribute('role','status'); el.style.color = 'var(--dourado)'; document.getElementById('meus-agendamentos')?.prepend(el); setTimeout(() => el.remove(), 4000); }

auth.onAuthStateChanged(user => {
    if (!user) { window.location.href = 'login.html'; return; }
    const titulo = document.getElementById('boas-vindas'); if (titulo) titulo.textContent = `Olá, ${user.displayName || user.email || 'cliente'}`;
    carregarMeusAgendamentos(user.uid);
});

function carregarMeusAgendamentos(uid) {
    const container = document.getElementById('meus-agendamentos');
    database.ref('agendamentos').orderByChild('cliente_uid').equalTo(uid).on('value', snap => {
        container.replaceChildren();
        if (!snap.exists()) { container.appendChild(texto('p', 'Você ainda não possui agendamentos.')); return; }
        const registros = []; snap.forEach(child => registros.push({ id: child.key, dados: child.val() || {} }));
        registros.reverse().forEach(({id, dados: ag}) => {
            const card = document.createElement('article'); card.className = 'card-item';
            card.style.cssText = 'background:#121212;padding:20px;border-radius:10px;border:1px solid #333;';
            card.appendChild(texto('strong', `${ag.data || 'Data não informada'} — ${ag.horario || 'Horário não informado'}`));
            card.appendChild(texto('p', `${ag.servico || 'Serviço'} · ${ag.barbeiro || 'Profissional'}`));
            const status = texto('span', ag.status || 'Pendente'); status.style.color = ag.status === 'Concluído' ? '#36c275' : '#d4af37'; card.appendChild(status);
            if (ag.status === 'Concluído' && !ag.avaliado) {
                const box = document.createElement('div'); box.style.cssText = 'margin-top:15px;border-top:1px solid #333;padding-top:15px;';
                box.appendChild(texto('p', 'Avalie seu atendimento:'));
                const nota = document.createElement('select'); nota.id = `nota-${id}`; nota.setAttribute('aria-label','Nota do atendimento');
                [5,4,3,2,1].forEach(n => { const op = document.createElement('option'); op.value = String(n); op.textContent = '★'.repeat(n); nota.appendChild(op); });
                const comentario = document.createElement('textarea'); comentario.id = `coment-${id}`; comentario.maxLength = 500; comentario.placeholder = 'Conte como foi sua experiência (opcional)'; comentario.style.cssText = 'display:block;width:100%;margin-top:8px;padding:10px;';
                const enviar = document.createElement('button'); enviar.type = 'button'; enviar.textContent = 'ENVIAR AVALIAÇÃO'; enviar.style.cssText = 'width:100%;background:#d4af37;border:0;padding:10px;margin-top:10px;cursor:pointer;font-weight:bold;';
                enviar.addEventListener('click', () => enviarAvaliacao(id, uid, nota, comentario, enviar));
                box.append(nota, comentario, enviar); card.appendChild(box);
            } else if (ag.avaliado) { const avaliado = texto('p', '✓ Atendimento avaliado'); avaliado.style.color = '#36c275'; card.appendChild(avaliado); }
            container.appendChild(card);
        });
    }, error => { console.error(error); container.replaceChildren(texto('p','Não foi possível carregar seus agendamentos.')); });
}

async function enviarAvaliacao(agId, uid, notaEl, comentarioEl, botao) {
    botao.disabled = true;
    try {
        const ref = database.ref(`agendamentos/${agId}`);
        const snap = await ref.once('value'); const ag = snap.val();
        if (!ag || ag.cliente_uid !== uid || ag.status !== 'Concluído' || ag.avaliado) throw new Error('Este atendimento não está disponível para avaliação.');
        const flag = ref.child('avaliado');
        const reservaAvaliacao = await flag.transaction(atual => atual === true ? undefined : true, undefined, false);
        if (!reservaAvaliacao.committed) throw new Error('Este atendimento já foi avaliado.');
        try {
            const avaliacaoRef = database.ref('avaliacoes').push();
            await avaliacaoRef.set({ nota: Math.max(1, Math.min(5, Number(notaEl.value))), comentario: comentarioEl.value.trim().slice(0,500), barbeiro: String(ag.barbeiro || ''), cliente: String(ag.cliente || ''), cliente_uid: uid, agendamento_id: agId, timestamp: Date.now() });
        } catch (erroGravacao) {
            await flag.transaction(atual => atual === true ? false : atual, undefined, false);
            throw erroGravacao;
        }
        mostrarAvisoPerfil('Obrigado pela avaliação!');
    } catch (error) { console.error(error); mostrarAvisoPerfil(error.message || 'Não foi possível enviar sua avaliação.'); botao.disabled = false; }
}
function logout() { auth.signOut().then(() => window.location.href = 'index.html').catch(() => mostrarAvisoPerfil('Não foi possível sair da conta.')); }
