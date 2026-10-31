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

const menuToggle = document.getElementById('mobile-menu');
const navLinks = document.querySelector('.nav-links');
if (menuToggle && navLinks) {
    menuToggle.addEventListener('click', () => navLinks.classList.toggle('active'));
    navLinks.querySelectorAll('a').forEach(link => link.addEventListener('click', () => navLinks.classList.remove('active')));
}

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
            if (zap && dados.whatsapp) { zap.value = dados.whatsapp; zap.readOnly = true; }
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
            const card = document.createElement('button'); card.type = 'button'; card.className = 'card-selecao'; card.style.cssText = 'border:0;background:transparent;color:inherit;font:inherit;cursor:pointer;';
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
        divServicos.replaceChildren(); window.servicosSelecionados = []; window.servicosDetalhes = [];
        if (!snap.exists()) return mensagemVazia(divServicos, 'Nenhum serviço cadastrado.');
        snap.forEach(child => {
            const s = child.val() || {}; const preco = Number(s.preco);
            if (!String(s.nome || '').trim() || !Number.isFinite(preco) || preco < 0) return;
            const card = document.createElement('button'); card.type = 'button'; card.className = 'card-servico'; card.style.cssText = 'text-align:left;color:inherit;font:inherit;cursor:pointer;';
            const info = document.createElement('div'); const titulo = document.createElement('h4'); titulo.textContent = String(s.nome);
            const descricao = document.createElement('p'); descricao.textContent = String(s.descricao || '');
            const valor = document.createElement('span'); valor.className = 'preco'; valor.textContent = `R$ ${preco.toFixed(2).replace('.', ',')}`;
            info.append(titulo, descricao); card.append(info, valor);
            card.addEventListener('click', () => {
                card.classList.toggle('ativo'); const nome = String(s.nome); const detalhe = `${nome} (R$ ${preco.toFixed(2).replace('.', ',')})`;
                if (card.classList.contains('ativo')) { window.servicosSelecionados.push(nome); window.servicosDetalhes.push(detalhe); }
                else { window.servicosSelecionados = window.servicosSelecionados.filter(x => x !== nome); window.servicosDetalhes = window.servicosDetalhes.filter(x => x !== detalhe); }
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
function renderizarHorarios(ocupados = new Set()) {
    if (!listaHorarios) return;
    listaHorarios.replaceChildren();
    horariosDisponiveis.forEach(hora => {
        const btn = document.createElement('button'); btn.type = 'button'; btn.className = 'btn-horario'; btn.textContent = ocupados.has(hora) ? `${hora} (Ocupado)` : hora;
        if (ocupados.has(hora)) { btn.disabled = true; btn.style.opacity = '.35'; }
        else btn.addEventListener('click', () => {
            listaHorarios.querySelectorAll('.btn-horario').forEach(el => { el.style.backgroundColor = 'rgba(255,255,255,.02)'; el.style.color = 'var(--texto-cinza)'; el.style.borderColor = 'rgba(255,255,255,.05)'; });
            btn.style.backgroundColor = 'rgba(212,175,55,.1)'; btn.style.color = 'var(--dourado)'; btn.style.borderColor = 'var(--dourado)'; horarioSelecionado = hora;
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
        if (nome.length < 2 || zap.length < 10 || zap.length > 13 || data < hojeLocalISO() || !hora || !window.barbeiroSelecionado || !window.servicosSelecionados.length) {
            mostrarAviso('Revise seus dados, serviços, data e horário.', 'var(--perigo)'); return;
        }
        if (btn) { btn.disabled = true; btn.textContent = 'PROCESSANDO...'; }
        const datas = [data];
        if (recorrencia !== 'nenhuma') {
            const dias = Number(recorrencia);
            if (![15, 30].includes(dias)) { if (btn) { btn.disabled = false; btn.textContent = 'CONFIRMAR'; } return mostrarAviso('Opção de recorrência inválida.', 'var(--perigo)'); }
            const [ano, mes, dia] = data.split('-').map(Number); const futura = new Date(ano, mes - 1, dia, 12); futura.setDate(futura.getDate() + dias);
            const futuraISO = `${futura.getFullYear()}-${String(futura.getMonth()+1).padStart(2,'0')}-${String(futura.getDate()).padStart(2,'0')}`;
            datas.push(futuraISO);
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
            const destino = '5561999999999'; // Substituir pelo WhatsApp oficial antes de publicar.
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
