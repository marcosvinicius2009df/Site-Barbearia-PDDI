/* Perfil do cliente — renderização segura (sem interpolar dados do banco em HTML),
   agendamentos separados em próximos/histórico e cancelamento pelo próprio cliente. */
function texto(tag, valor, classe) { const el = document.createElement(tag); el.textContent = String(valor ?? ''); if (classe) el.className = classe; return el; }
function mostrarAvisoPerfil(mensagem) {
    const el = texto('p', mensagem); el.setAttribute('role', 'status'); el.style.cssText = 'color:var(--dourado);font-weight:500;';
    document.getElementById('meus-agendamentos')?.prepend(el); setTimeout(() => el.remove(), 4000);
}
// Mesma função usada em script.js para montar a chave do slot em reservas_slots.
function chaveBarbeiro(nome) {
    let hash = 2166136261;
    for (const char of String(nome).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()) { hash ^= char.charCodeAt(0); hash = Math.imul(hash, 16777619); }
    return `b_${(hash >>> 0).toString(16)}`;
}
function hojeLocalISO() { const a = new Date(); return new Date(a.getTime() - a.getTimezoneOffset() * 60000).toISOString().slice(0, 10); }
function dataBR(v) { return /^\d{4}-\d{2}-\d{2}$/.test(String(v)) ? String(v).split('-').reverse().join('/') : String(v || 'Data não informada'); }
function tipoStatus(status) {
    const s = String(status || 'Pendente').toLowerCase();
    if (s.includes('cancel')) return 'cancelado'; if (s.includes('conclu')) return 'concluido'; if (s.includes('confirm')) return 'confirmado'; return 'pendente';
}

auth.onAuthStateChanged(user => {
    if (!user) { window.location.href = 'login.html'; return; }
    const titulo = document.getElementById('boas-vindas'); if (titulo) titulo.textContent = `Olá, ${user.displayName || user.email || 'cliente'}`;
    database.ref(`clientes/${user.uid}/nome`).once('value').then(s => { if (titulo && s.val()) titulo.textContent = `Olá, ${String(s.val()).split(' ')[0]}`; }).catch(() => {});
    carregarMeusAgendamentos(user.uid);
});

function carregarMeusAgendamentos(uid) {
    const container = document.getElementById('meus-agendamentos');
    database.ref('agendamentos').orderByChild('cliente_uid').equalTo(uid).on('value', snap => {
        container.replaceChildren();
        if (!snap.exists()) { container.appendChild(texto('p', 'Você ainda não possui agendamentos.')); return; }
        const registros = []; snap.forEach(child => { registros.push({ id: child.key, ag: child.val() || {} }); });
        const hoje = hojeLocalISO();
        const encerrado = ({ ag }) => ['cancelado', 'concluido'].includes(tipoStatus(ag.status)) || (/^\d{4}-\d{2}-\d{2}$/.test(String(ag.data)) && ag.data < hoje);
        const chave = ({ ag }) => `${ag.data || ''} ${ag.horario || ''}`;
        const proximos = registros.filter(r => !encerrado(r)).sort((a, b) => chave(a).localeCompare(chave(b)));
        const historico = registros.filter(encerrado).sort((a, b) => chave(b).localeCompare(chave(a)));
        if (proximos.length) { container.appendChild(texto('h3', 'Próximos', 'perfil-secao')); proximos.forEach(r => container.appendChild(montarCard(r, uid))); }
        if (historico.length) { container.appendChild(texto('h3', 'Histórico', 'perfil-secao')); historico.forEach(r => container.appendChild(montarCard(r, uid))); }
    }, error => { console.error(error); container.replaceChildren(texto('p', 'Não foi possível carregar seus agendamentos.')); });
}

function montarCard({ id, ag }, uid) {
    const tipo = tipoStatus(ag.status);
    const card = document.createElement('article'); card.className = 'ag-card';
    const topo = document.createElement('header');
    topo.append(texto('strong', `${dataBR(ag.data)} — ${ag.horario || 'Horário não informado'}`), texto('span', ag.status || 'Pendente', `badge badge-${tipo}`));
    card.appendChild(topo);
    card.appendChild(texto('p', `${ag.servico || 'Serviço'} · ${ag.barbeiro || 'Profissional'}`));
    const acoes = document.createElement('div'); acoes.className = 'ag-acoes';
    const futuro = !/^\d{4}-\d{2}-\d{2}$/.test(String(ag.data)) || ag.data >= hojeLocalISO();

    if (tipo === 'pendente' && futuro) {
        const cancelar = texto('button', 'Cancelar agendamento', 'btn-secundario btn-perigo'); cancelar.type = 'button';
        cancelar.addEventListener('click', () => cancelarAgendamento(id, ag, cancelar));
        acoes.appendChild(cancelar);
    }
    if ((tipo === 'pendente' || tipo === 'confirmado') && futuro && typeof WHATSAPP_OFICIAL !== 'undefined') {
        const msg = `Olá, JLukas! Sobre meu agendamento de ${dataBR(ag.data)} às ${ag.horario || ''} com ${ag.barbeiro || ''}.`;
        const zap = texto('a', 'Falar com a barbearia', 'btn-secundario'); zap.href = `https://wa.me/${WHATSAPP_OFICIAL}?text=${encodeURIComponent(msg)}`; zap.target = '_blank'; zap.rel = 'noopener noreferrer';
        acoes.appendChild(zap);
    }
    if (acoes.children.length) card.appendChild(acoes);

    if (tipo === 'concluido' && !ag.avaliado) {
        const box = document.createElement('div'); box.style.cssText = 'margin-top:15px;border-top:1px solid #333;padding-top:15px;';
        box.appendChild(texto('p', 'Avalie seu atendimento:'));
        const nota = document.createElement('select'); nota.id = `nota-${id}`; nota.setAttribute('aria-label', 'Nota do atendimento');
        [5, 4, 3, 2, 1].forEach(n => { const op = document.createElement('option'); op.value = String(n); op.textContent = '★'.repeat(n); nota.appendChild(op); });
        const comentario = document.createElement('textarea'); comentario.id = `coment-${id}`; comentario.maxLength = 500; comentario.setAttribute('aria-label', 'Comentário'); comentario.placeholder = 'Conte como foi sua experiência (opcional)'; comentario.style.cssText = 'display:block;width:100%;margin-top:8px;padding:10px;';
        const enviar = document.createElement('button'); enviar.type = 'button'; enviar.textContent = 'ENVIAR AVALIAÇÃO'; enviar.style.cssText = 'width:100%;background:#d4af37;border:0;padding:10px;margin-top:10px;cursor:pointer;font-weight:bold;';
        enviar.addEventListener('click', () => enviarAvaliacao(id, uid, nota, comentario, enviar));
        box.append(nota, comentario, enviar); card.appendChild(box);
    } else if (ag.avaliado) card.appendChild(texto('p', '✓ Atendimento avaliado', 'badge-concluido'));
    return card;
}

async function cancelarAgendamento(id, ag, botao) {
    if (!window.confirm('Deseja realmente cancelar este agendamento?')) return;
    botao.disabled = true;
    try {
        // 1) muda o status só se ainda estiver pendente
        const r = await database.ref(`agendamentos/${id}/status`).transaction(atual => (atual === null || atual === 'Pendente') ? 'Cancelado' : undefined, undefined, false);
        if (!r.committed) throw new Error('Este agendamento não pode mais ser cancelado por aqui. Fale com a barbearia.');
        // 2) libera o horário para outros clientes (só remove se o slot for deste agendamento)
        const slot = database.ref(`reservas_slots/${ag.data}/${chaveBarbeiro(ag.barbeiro)}/${String(ag.horario).replace(':', '')}`);
        await slot.transaction(atual => (atual && atual.bookingId === id) ? null : atual, undefined, false);
        mostrarAvisoPerfil('Agendamento cancelado.');
    } catch (error) { console.error(error); mostrarAvisoPerfil(error.message || 'Não foi possível cancelar.'); botao.disabled = false; }
}

async function enviarAvaliacao(agId, uid, notaEl, comentarioEl, botao) {
    botao.disabled = true;
    try {
        const ref = database.ref(`agendamentos/${agId}`);
        const snap = await ref.once('value'); const ag = snap.val();
        if (!ag || ag.cliente_uid !== uid || tipoStatus(ag.status) !== 'concluido' || ag.avaliado) throw new Error('Este atendimento não está disponível para avaliação.');
        const flag = ref.child('avaliado');
        const reservaAvaliacao = await flag.transaction(atual => atual === true ? undefined : true, undefined, false);
        if (!reservaAvaliacao.committed) throw new Error('Este atendimento já foi avaliado.');
        try {
            const avaliacaoRef = database.ref('avaliacoes').push();
            await avaliacaoRef.set({ nota: Math.max(1, Math.min(5, Number(notaEl.value))), comentario: comentarioEl.value.trim().slice(0, 500), barbeiro: String(ag.barbeiro || ''), cliente: String(ag.cliente || ''), cliente_uid: uid, agendamento_id: agId, timestamp: Date.now() });
        } catch (erroGravacao) {
            await flag.transaction(atual => atual === true ? false : atual, undefined, false);
            throw erroGravacao;
        }
        mostrarAvisoPerfil('Obrigado pela avaliação!');
    } catch (error) { console.error(error); mostrarAvisoPerfil(error.message || 'Não foi possível enviar sua avaliação.'); botao.disabled = false; }
}
function logout() { auth.signOut().then(() => window.location.href = 'index.html').catch(() => mostrarAvisoPerfil('Não foi possível sair da conta.')); }
