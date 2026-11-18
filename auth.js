/* Autenticação JLukas — validação de entrada e mensagens controladas. */
function mostrarAviso(mensagem, cor = 'var(--dourado)') {
    const toast = document.createElement('div'); toast.textContent = String(mensagem); toast.setAttribute('role', 'status');
    toast.style.cssText = `position:fixed;bottom:20px;right:20px;max-width:min(90vw,420px);background:var(--bg-card);color:${cor};padding:15px 25px;border-radius:8px;border:1px solid ${cor};z-index:99999;`;
    document.body.appendChild(toast); setTimeout(() => toast.remove(), 4000);
}
const formAuth = document.getElementById('form-auth');
const btnAuth = document.getElementById('btn-auth');
const tituloAuth = document.getElementById('titulo-auth');
const linkAlternar = document.getElementById('link-alternar');
const trocarTexto = document.getElementById('trocar-texto');
const divNome = document.getElementById('campo-nome');
const divZap = document.getElementById('campo-whatsapp');
const inputNome = document.getElementById('nome-cadastro');
const inputZap = document.getElementById('zap-cadastro');
const inputEmail = document.getElementById('email');
const inputSenha = document.getElementById('senha');
let modoLogin = true;

// Máscara de telefone no cadastro
if (inputZap) inputZap.addEventListener('input', () => {
    const d = inputZap.value.replace(/\D/g, '').slice(0, 11);
    inputZap.value = d.length <= 2 ? d : d.length <= 6 ? `(${d.slice(0, 2)}) ${d.slice(2)}` : d.length <= 10 ? `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}` : `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
});
// Mostrar/ocultar senha
if (inputSenha) {
    const verSenha = document.createElement('button'); verSenha.type = 'button'; verSenha.className = 'btn-senha'; verSenha.textContent = 'Mostrar senha';
    verSenha.setAttribute('aria-pressed', 'false');
    verSenha.addEventListener('click', () => {
        const mostrar = inputSenha.type === 'password'; inputSenha.type = mostrar ? 'text' : 'password';
        verSenha.textContent = mostrar ? 'Ocultar senha' : 'Mostrar senha'; verSenha.setAttribute('aria-pressed', String(mostrar));
    });
    inputSenha.closest('.campo')?.appendChild(verSenha);
}

// Recuperação de senha pelo Firebase Authentication.
const recuperar = document.createElement('button'); recuperar.type = 'button'; recuperar.textContent = 'Esqueci minha senha';
recuperar.className = 'link-recuperar-senha'; recuperar.style.cssText = 'display:block;margin:14px auto 0;background:none;border:0;color:var(--dourado);text-decoration:underline;cursor:pointer;';
if (formAuth) formAuth.appendChild(recuperar);


if (linkAlternar) linkAlternar.addEventListener('click', event => {
    event.preventDefault(); modoLogin = !modoLogin;
    tituloAuth.textContent = modoLogin ? 'Entrar na Conta' : 'Criar Nova Conta';
    btnAuth.textContent = modoLogin ? 'ENTRAR' : 'CADASTRAR';
    trocarTexto.textContent = modoLogin ? 'Ainda não tem conta?' : 'Já tem uma conta?';
    linkAlternar.textContent = modoLogin ? 'Cadastre-se' : 'Fazer Login';
    divNome.style.display = modoLogin ? 'none' : 'block'; divZap.style.display = modoLogin ? 'none' : 'block';
    inputNome.required = !modoLogin; inputZap.required = !modoLogin;
    inputSenha.autocomplete = modoLogin ? 'current-password' : 'new-password';
    recuperar.style.display = modoLogin ? 'block' : 'none';
});

recuperar.addEventListener('click', async () => {
    const email = inputEmail?.value.trim();
    if (!email) return mostrarAviso('Informe seu e-mail para receber o link de recuperação.', 'var(--perigo)');
    try { await auth.sendPasswordResetEmail(email); mostrarAviso('Se o e-mail estiver cadastrado, você receberá as instruções de recuperação.'); }
    catch (error) { console.error(error); mostrarAviso('Não foi possível enviar o e-mail de recuperação.', 'var(--perigo)'); }
});

if (formAuth) formAuth.addEventListener('submit', async event => {
    event.preventDefault();
    const email = inputEmail.value.trim().toLowerCase(); const senha = inputSenha.value;
    if (!email || !senha) return mostrarAviso('Preencha e-mail e senha.', 'var(--perigo)');
    if (!modoLogin && (inputNome.value.trim().length < 2 || inputZap.value.replace(/\D/g, '').length < 10)) return mostrarAviso('Informe seu nome e um WhatsApp válido.', 'var(--perigo)');
    btnAuth.disabled = true; btnAuth.textContent = modoLogin ? 'ENTRANDO...' : 'CADASTRANDO...';
    try {
        if (modoLogin) {
            await auth.signInWithEmailAndPassword(email, senha);
            window.location.href = 'index.html';
        } else {
            const zap = inputZap.value.replace(/\D/g, '');
            const credencial = await auth.createUserWithEmailAndPassword(email, senha);
            try {
                await database.ref(`clientes/${credencial.user.uid}`).set({
                    nome: inputNome.value.trim().slice(0, 100), whatsapp: zap, email,
                    dataCadastro: new Date().toISOString()
                });
            } catch (erroPerfil) {
                // A conta já existe; não deixa o usuário preso. Ele informa nome/WhatsApp no agendamento.
                console.error('Conta criada, mas o cadastro não foi salvo:', erroPerfil);
                mostrarAviso('Conta criada, mas não foi possível salvar seus dados. Informe-os no agendamento.', 'var(--perigo)');
                await new Promise(r => setTimeout(r, 2500));
            }
            window.location.href = 'index.html';
        }
    } catch (error) {
        console.error('Erro de autenticação:', error);
        const mensagens = {
            'auth/invalid-email': 'O e-mail informado não é válido.',
            'auth/user-not-found': 'E-mail ou senha incorretos.',
            'auth/wrong-password': 'E-mail ou senha incorretos.',
            'auth/invalid-credential': 'E-mail ou senha incorretos.',
            'auth/email-already-in-use': 'Este e-mail já está cadastrado.',
            'auth/weak-password': 'A senha deve ter pelo menos 6 caracteres.',
            'auth/too-many-requests': 'Muitas tentativas. Aguarde e tente novamente.'
        };
        mostrarAviso(mensagens[error.code] || 'Não foi possível concluir a operação. Tente novamente.', 'var(--perigo)');
        btnAuth.disabled = false; btnAuth.textContent = modoLogin ? 'ENTRAR' : 'CADASTRAR';
    }
});
