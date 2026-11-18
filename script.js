/* JLukas Barber Shop — fluxo de agendamento revisado.
   Nota: a exclusividade do horário usa transação no Realtime Database.
   As regras do Firebase precisam permitir o acesso autenticado ao caminho
   reservas_slots e validar os dados no servidor (ver README-SEGURANCA.md). */

function mostrarAviso(mensagem, cor = "var(--dourado)") {
    const toast = document.createElement("div");
    toast.textContent = String(mensagem);
    toast.setAttribute("role", "status");
    toast.style.cssText = `position:fixed;bottom:20px;right:20px;max-width:min(90vw,420px);background:var(--bg-card);color:${cor};padding:15px 25px;border-radius:8px;border:1px solid ${cor};z-index:99999;box-shadow:0 4px 10px rgba(0,0,0,.5);font-family:'Poppins',sans-serif;`;
    document.body.appendChild(toast);
    window.setTimeout(() => toast.remove(), 4000);
}

document.documentElement.classList.add('js');
const menuToggle = document.getElementById('mobile-menu');
const navLinks = document.querySelector('.nav-links');
if (menuToggle && navLinks) {
    const definirMenu = aberto => {
        navLinks.classList.toggle('active', aberto);
        menuToggle.setAttribute('aria-expanded', String(aberto));
        menuToggle.textContent = aberto ? '✕' : '☰';
        menuToggle.setAttribute('aria-label', aberto ? 'Fechar menu' : 'Abrir menu');
    };
    menuToggle.addEventListener('click', () => definirMenu(!navLinks.classList.contains('active')));
    menuToggle.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); menuToggle.click(); } });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') definirMenu(false); });
    navLinks.querySelectorAll('a').forEach(link => link.addEventListener('click', () => definirMenu(false)));
}
// Navbar compacta ao rolar
const navbar = document.querySelector('.navbar');
if (navbar) { const atualizarNav = () => navbar.classList.toggle('scrolled', window.scrollY > 30); atualizarNav(); window.addEventListener('scroll', atualizarNav, { passive: true }); }
// Animação de entrada dos elementos .reveal
const revelaveis = document.querySelectorAll('.reveal');
if ('IntersectionObserver' in window && revelaveis.length) {
    const obs = new IntersectionObserver(entradas => entradas.forEach(e => { if (e.isIntersecting) { e.target.classList.add('visivel'); obs.unobserve(e.target); } }), { threshold: .15 });
    revelaveis.forEach(el => obs.observe(el));
} else revelaveis.forEach(el => el.classList.add('visivel'));
// Links de WhatsApp (número único definido em firebase-init.js)
document.querySelectorAll('[data-whatsapp]').forEach(a => { a.href = `https://wa.me/${WHATSAPP_OFICIAL}?text=${encodeURIComponent(a.dataset.whatsapp)}`; });

function mascaraTelefone(valor) {
    const d = String(valor || '').replace(/\D/g, '').slice(0, 11);
    if (d.length <= 2) return d;
    if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
    if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
    return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}
const campoZap = document.getElementById('whatsapp');
if (campoZap) campoZap.addEventListener('input', () => { if (!campoZap.readOnly) campoZap.value = mascaraTelefone(campoZap.value); });

if (auth) {
    auth.onAuthStateChanged(async user => {
        const navConta = document.getElementById('nav-conta');
        const navLogout = document.getElementById('nav-logout');
        if (navConta) {
            navConta.textContent = user ? 'Meu Perfil' : 'Minha Conta';
            navConta.href = user ? 'perfil.html' : 'login.html';
        }
        if (navLogout) navLogout.style.display = user ? 'inline-block' : 'none';
        if (!user || !database) return;
        try {
            const snap = await database.ref(`clientes/${user.uid}`).once('value');
            const dados = snap.val() || {};
            const nome = document.getElementById('nome');
            const zap = document.getElementById('whatsapp');
            if (nome && dados.nome) { nome.value = dados.nome; nome.readOnly = true; }
            if (zap && dados.whatsapp) { zap.value = mascaraTelefone(dados.whatsapp); zap.readOnly = true; }
        } catch (error) { console.error('Não foi possível carregar o perfil do cliente.', error); }
    });
}
window.fazerLogout = async function () {
    try { await auth.signOut(); window.location.href = 'index.html'; }
    catch (error) { mostrarAviso('Não foi possível sair da conta. Tente novamente.', 'var(--perigo)'); }
};

window.barbeiroSelecionado = '';
window.servicosSelecionados = [];
window.servicosDetalhes = [];
window.servicosPrecos = {};
let horarioSelecionado = '';
const listaHorarios = document.getElementById('lista-horarios');
const inputData = document.getElementById('data');
const horariosDisponiveis = ['09:00','10:00','11:00','13:00','14:00','15:00','16:00','17:00','18:00'];
const fallbackImagem = 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?q=80&w=400&auto=format&fit=crop';

function hojeLocalISO() {
    const agora = new Date();
    const local = new Date(agora.getTime() - agora.getTimezoneOffset() * 60000);
    return local.toISOString().slice(0, 10);
}
function urlImagemSegura(valor) {
    try {
        const url = new URL(valor || fallbackImagem, window.location.origin);
        return ['http:', 'https:'].includes(url.protocol) ? url.href : fallbackImagem;
    } catch { return fallbackImagem; }
}
function chaveBarbeiro(nome) {
    let hash = 2166136261;
    for (const char of String(nome).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()) {
        hash ^= char.charCodeAt(0);
        hash = Math.imul(hash, 16777619);
    }
    return `b_${(hash >>> 0).toString(16)}`;
}
function formatarReais(v) { return `R$ ${Number(v).toFixed(2).replace('.', ',')}`; }
function dataBR(iso) { return iso.split('-').reverse().join('/'); }
function somarDias(iso, dias) {
    const [a, m, d] = iso.split('-').map(Number); const f = new Date(a, m - 1, d, 12); f.setDate(f.getDate() + dias);
    return `${f.getFullYear()}-${String(f.getMonth() + 1).padStart(2, '0')}-${String(f.getDate()).padStart(2, '0')}`;
}
function diaSemana(iso) {
    const [a, m, d] = iso.split('-').map(Number);
    return ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'][new Date(a, m - 1, d, 12).getDay()];
}
function atualizarResumo() {
    const box = document.getElementById('resumo-agendamento'); if (!box) return;
    const data = inputData?.value || ''; const pomada = document.getElementById('upsell-pomada')?.checked;
    const dias = Number(document.getElementById('recorrencia')?.value) || 0;
    const total = Object.values(window.servicosPrecos).reduce((t, v) => t + Number(v), 0) + (pomada ? 45 : 0);
    const linhas = [
        ['Profissional', window.barbeiroSelecionado], ['Serviços', window.servicosSelecionados.join(', ') + (pomada ? ', Pomada Matte' : '')],
        ['Data', data ? `${dataBR(data)} (${diaSemana(data)})` : ''], ['Horário', horarioSelecionado]
    ];
    if (dias && data) linhas.push(['Retorno', dataBR(somarDias(data, dias))]);
    const titulo = document.createElement('h4'); titulo.textContent = 'Resumo do agendamento';
    box.replaceChildren(titulo);
    linhas.forEach(([k, v]) => { const l = document.createElement('div'); l.className = 'resumo-linha'; const a = document.createElement('span'); a.textContent = k; const b = document.createElement('strong'); b.textContent = String(v || '—'); l.append(a, b); box.appendChild(l); });
    const t = document.createElement('div'); t.className = 'resumo-linha resumo-total'; const ta = document.createElement('span'); ta.textContent = 'Total estimado'; const tb = document.createElement('strong'); tb.textContent = formatarReais(total); t.append(ta, tb); box.appendChild(t);
}
document.getElementById('upsell-pomada')?.addEventListener('change', atualizarResumo);
document.getElementById('recorrencia')?.addEventListener('change', atualizarResumo);
function mensagemVazia(container, texto) {
    const p = document.createElement('p'); p.className = 'texto-vazio'; p.textContent = texto; container.replaceChildren(p);
}

window.avancarPasso = function (passoAtual) {
    if (passoAtual === 1) {
        const nome = document.getElementById('nome')?.value.trim() || '';
        const zap = document.getElementById('whatsapp')?.value.replace(/\D/g, '') || '';
        if (nome.length < 2 || zap.length < 10 || zap.length > 13) return mostrarAviso('Informe seu nome e um WhatsApp válido.', 'var(--perigo)');
        trocarTela(1, 2, 'Profissional & Serviço');
    } else if (passoAtual === 2) {
        if (!window.barbeiroSelecionado) return mostrarAviso('Escolha um profissional.', 'var(--perigo)');
        if (!window.servicosSelecionados.length) return mostrarAviso('Escolha pelo menos um serviço.', 'var(--perigo)');
        trocarTela(2, 3, 'Data & Hora');
    } else if (passoAtual === 3) {
        if (!inputData?.value || inputData.value < hojeLocalISO() || !horarioSelecionado) return mostrarAviso('Escolha uma data válida e um horário disponível.', 'var(--perigo)');
        trocarTela(3, 4, 'Pronto para Confirmar');
    }
};
window.voltarPasso = function (passoAtual) {
    if (passoAtual === 2) trocarTela(2, 1, 'Seus Dados', true);
    if (passoAtual === 3) trocarTela(3, 2, 'Profissional & Serviço', true);
    if (passoAtual === 4) trocarTela(4, 3, 'Data & Hora', true);
};
function trocarTela(atual, proxima, texto, voltando = false) {
    const blocoAtual = document.getElementById(`bloco-passo-${atual}`);
    const blocoProximo = document.getElementById(`bloco-passo-${proxima}`);
    if (!blocoAtual || !blocoProximo) return;
    blocoAtual.classList.remove('ativo');
    blocoProximo.style.animation = voltando ? 'deslizarEsquerda .4s ease forwards' : 'deslizarDireita .4s ease forwards';
    blocoProximo.classList.add('ativo');
    const progresso = document.getElementById('progress-text'); if (progresso) progresso.textContent = texto;
    if (proxima === 4) atualizarResumo();
    window.scrollTo({ top: 0, behavior: 'smooth' });
    for (let i = 1; i <= 4; i++) {
        const step = document.getElementById(`step-${i}`);
        if (step) step.className = i <= proxima ? 'progress-step active' : 'progress-step';
    }
}

const divBarbeiros = document.getElementById('lista-barbeiros-agendar');
if (divBarbeiros && database) {
    database.ref('barbeiros').on('value', snap => {
        divBarbeiros.replaceChildren();
        if (!snap.exists()) return mensagemVazia(divBarbeiros, 'Nenhum profissional disponível.');
        snap.forEach(child => {
            const b = child.val() || {};
            const card = document.createElement('button'); card.type = 'button'; card.className = 'card-selecao';
            const img = document.createElement('img'); img.src = urlImagemSegura(b.imagem); img.alt = `Foto de ${String(b.nome || 'profissional')}`; img.loading = 'lazy';
            const nome = document.createElement('p'); nome.textContent = String(b.nome || 'Profissional');
            card.append(img, nome);
            card.addEventListener('click', () => {
                divBarbeiros.querySelectorAll('.card-selecao').forEach(el => el.classList.remove('ativo'));
                card.classList.add('ativo'); window.barbeiroSelecionado = String(b.nome || '');
                window.buscarHorariosOcupados();
            });
            divBarbeiros.appendChild(card);
        });
    }, error => { console.error(error); mensagemVazia(divBarbeiros, 'Não foi possível carregar a equipe.'); });
}

const divServicos = document.getElementById('lista-servicos-agendar');
if (divServicos && database) {
    database.ref('servicos').on('value', snap => {
        divServicos.replaceChildren(); window.servicosSelecionados = []; window.servicosDetalhes = []; window.servicosPrecos = {};
        if (!snap.exists()) return mensagemVazia(divServicos, 'Nenhum serviço cadastrado.');
        snap.forEach(child => {
            const s = child.val() || {}; const preco = Number(s.preco);
            if (!String(s.nome || '').trim() || !Number.isFinite(preco) || preco < 0) return;
            const card = document.createElement('button'); card.type = 'button'; card.className = 'card-servico'; card.setAttribute('aria-pressed', 'false'); card.style.cssText = 'text-align:left;color:inherit;font:inherit;cursor:pointer;';
            const info = document.createElement('div'); const titulo = document.createElement('h4'); titulo.textContent = String(s.nome);
            const descricao = document.createElement('p'); descricao.textContent = String(s.descricao || '');
            const valor = document.createElement('span'); valor.className = 'preco'; valor.textContent = `R$ ${preco.toFixed(2).replace('.', ',')}`;
            info.append(titulo, descricao); card.append(info, valor);
            card.addEventListener('click', () => {
                card.classList.toggle('ativo'); const nome = String(s.nome); const detalhe = `${nome} (R$ ${preco.toFixed(2).replace('.', ',')})`;
                card.setAttribute('aria-pressed', String(card.classList.contains('ativo')));
                if (card.classList.contains('ativo')) { window.servicosSelecionados.push(nome); window.servicosDetalhes.push(detalhe); window.servicosPrecos[nome] = preco; }
                else { window.servicosSelecionados = window.servicosSelecionados.filter(x => x !== nome); window.servicosDetalhes = window.servicosDetalhes.filter(x => x !== detalhe); delete window.servicosPrecos[nome]; }
            });
            divServicos.appendChild(card);
        });
    }, error => { console.error(error); mensagemVazia(divServicos, 'Não foi possível carregar os serviços.'); });
}

window.buscarHorariosOcupados = async function () {
    if (!listaHorarios || !database) return;
    const data = inputData?.value; const barbeiro = window.barbeiroSelecionado;
    horarioSelecionado = '';
    if (!data || !barbeiro) return mensagemVazia(listaHorarios, 'Escolha o profissional e a data.');
    if (data < hojeLocalISO()) return mensagemVazia(listaHorarios, 'Não é possível consultar datas passadas.');
    mensagemVazia(listaHorarios, 'Verificando disponibilidade...');
    try {
        const bloqueios = await database.ref('bloqueios').orderByChild('data').equalTo(data).once('value');
        if (bloqueios.exists()) return mensagemVazia(listaHorarios, 'A barbearia está fechada nesta data.');
        const lockSnap = await database.ref(`reservas_slots/${data}/${chaveBarbeiro(barbeiro)}`).once('value');
        const ocupados = new Set();
        lockSnap.forEach(child => { if (child.val()) ocupados.add(child.key.slice(0, 2) + ':' + child.key.slice(2)); });
        renderizarHorarios(ocupados);
    } catch (error) { console.error(error); mensagemVazia(listaHorarios, 'Não foi possível consultar os horários. Tente novamente.'); }
};
function horarioJaPassou(data, hora) {
    if (data !== hojeLocalISO()) return false;
    const [h, m] = hora.split(':').map(Number); const agora = new Date();
    return h * 60 + m <= agora.getHours() * 60 + agora.getMinutes();
}
function renderizarHorarios(ocupados = new Set()) {
    if (!listaHorarios) return;
    listaHorarios.replaceChildren();
    const data = inputData?.value || '';
    horariosDisponiveis.forEach(hora => {
        const passou = horarioJaPassou(data, hora);
        const btn = document.createElement('button'); btn.type = 'button'; btn.className = 'btn-horario';
        btn.textContent = ocupados.has(hora) ? `${hora} (Ocupado)` : passou ? `${hora} (Indisponível)` : hora;
        if (ocupados.has(hora) || passou) btn.disabled = true;
        else btn.addEventListener('click', () => {
            listaHorarios.querySelectorAll('.btn-horario').forEach(el => el.classList.remove('selecionado'));
            btn.classList.add('selecionado'); horarioSelecionado = hora;
        });
        listaHorarios.appendChild(btn);
    });
}
if (inputData) { inputData.min = hojeLocalISO(); inputData.addEventListener('change', () => { if (inputData.value < hojeLocalISO()) inputData.value = ''; window.buscarHorariosOcupados(); }); }

async function reservarBloqueio(data, barbeiro, hora, bookingId, uid) {
    const ref = database.ref(`reservas_slots/${data}/${chaveBarbeiro(barbeiro)}/${hora.replace(':', '')}`);
    const resultado = await ref.transaction(atual => atual === null ? { bookingId, uid, criadoEm: Date.now() } : undefined, undefined, false);
    if (!resultado.committed) throw new Error(`O horário ${hora} de ${data.split('-').reverse().join('/')} acabou de ser reservado por outra pessoa.`);
    return { ref, bookingId };
}
async function liberarBloqueio(lock) {
    if (!lock) return;
    await lock.ref.transaction(atual => atual && atual.bookingId === lock.bookingId ? null : atual, undefined, false);
}
const formAgendamento = document.getElementById('form-agendamento');
if (formAgendamento && database && auth) {
    formAgendamento.addEventListener('submit', async event => {
        event.preventDefault();
        const btn = document.getElementById('btn-submit-agendar');
        if (btn?.disabled) return;
        const user = auth.currentUser;
        if (!user) { mostrarAviso('Entre na sua conta para agendar.', 'var(--perigo)'); window.location.href = 'login.html'; return; }
        const nome = document.getElementById('nome')?.value.trim() || '';
        const zap = document.getElementById('whatsapp')?.value.replace(/\D/g, '') || '';
        const data = inputData?.value || ''; const hora = horarioSelecionado;
        const recorrencia = document.getElementById('recorrencia')?.value || 'nenhuma';
        const upsell = document.getElementById('upsell-pomada');
        if (nome.length < 2 || zap.length < 10 || zap.length > 13 || data < hojeLocalISO() || !hora || horarioJaPassou(data, hora) || !window.barbeiroSelecionado || !window.servicosSelecionados.length) {
            mostrarAviso('Revise seus dados, serviços, data e horário.', 'var(--perigo)'); return;
        }
        if (btn) { btn.disabled = true; btn.textContent = 'PROCESSANDO...'; }
        const datas = [data];
        if (recorrencia !== 'nenhuma') {
            const dias = Number(recorrencia);
            if (![15, 30].includes(dias)) { if (btn) { btn.disabled = false; btn.textContent = 'CONFIRMAR'; } return mostrarAviso('Opção de recorrência inválida.', 'var(--perigo)'); }
            datas.push(somarDias(data, dias));
        }
        const locks = [];
        try {
            const bloqueiosSnap = await database.ref('bloqueios').once('value');
            for (const dia of datas) {
                if (bloqueiosSnap.exists()) {
                    let fechado = false; bloqueiosSnap.forEach(child => { if ((child.val() || {}).data === dia) fechado = true; });
                    if (fechado) throw new Error(`A barbearia está fechada em ${dia.split('-').reverse().join('/')}.`);
                }
                const bookingId = database.ref('agendamentos').push().key;
                locks.push(await reservarBloqueio(dia, window.barbeiroSelecionado, hora, bookingId, user.uid));
            }
            const updates = {};
            datas.forEach((dia, index) => {
                const bookingId = locks[index].bookingId;
                const servicoTexto = window.servicosDetalhes.join(' + ') + (upsell?.checked ? ' + Pomada Matte (R$ 45,00)' : '');
                updates[`agendamentos/${bookingId}`] = {
                    cliente: nome, whatsapp: zap, cliente_email: user.email || '', cliente_uid: user.uid,
                    barbeiro: window.barbeiroSelecionado, servico: servicoTexto, data: dia, horario: hora,
                    status: 'Pendente', timestamp: Date.now(), recorrente: index > 0
                };
            });
            await database.ref().update(updates);
            const destino = WHATSAPP_OFICIAL; // definido em firebase-init.js
            const texto = `Olá, JLukas! Meu agendamento foi registrado como pendente.\nServiços: ${window.servicosDetalhes.join(' + ')}\nData: ${data.split('-').reverse().join('/')}\nHorário: ${hora}\nProfissional: ${window.barbeiroSelecionado}${datas.length > 1 ? `\nRetorno solicitado: ${datas[1].split('-').reverse().join('/')}` : ''}`;
            window.location.href = `https://wa.me/${destino}?text=${encodeURIComponent(texto)}`;
        } catch (error) {
            console.error('Falha ao reservar:', error);
            await Promise.allSettled(locks.map(liberarBloqueio));
            mostrarAviso(error.message || 'Não foi possível concluir o agendamento.', 'var(--perigo)');
            if (btn) { btn.disabled = false; btn.textContent = 'CONFIRMAR'; }
        }
    });
}
window.entrarListaEspera = async function () {
    const nome = document.getElementById('nome')?.value.trim() || ''; const zap = document.getElementById('whatsapp')?.value.replace(/\D/g, '') || ''; const data = inputData?.value || '';
    if (nome.length < 2 || zap.length < 10 || !data || data < hojeLocalISO() || !auth?.currentUser) return mostrarAviso('Entre na conta e informe nome, WhatsApp e data válida.', 'var(--perigo)');
    try { await database.ref('lista_espera').push({ cliente: nome, whatsapp: zap, data, cliente_uid: auth.currentUser.uid, timestamp: Date.now() }); mostrarAviso('Você entrou na lista de espera.'); }
    catch (error) { console.error(error); mostrarAviso('Não foi possível entrar na lista de espera.', 'var(--perigo)'); }
};
