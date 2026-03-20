// CONFIGURAÇÃO DO SEU FIREBASE
const firebaseConfig = {
    apiKey: "AIzaSyDy1-E_o45AuAbfyzNd8Qg6qS-d-pCFExM",
    authDomain: "barbearia-do-marcos.firebaseapp.com",
    databaseURL: "https://barbearia-do-marcos-default-rtdb.firebaseio.com",
    projectId: "barbearia-do-marcos",
    storageBucket: "barbearia-do-marcos.firebasestorage.app",
    messagingSenderId: "894105389352",
    appId: "1:894105389352:web:3a5a27602c0d589581e81d",
    measurementId: "G-53GKXL29Z9"
};

if (!firebase.apps.length) { firebase.initializeApp(firebaseConfig); }
const auth = firebase.auth();
const database = firebase.database(); // Adicionamos o banco de dados aqui

const formAuth = document.getElementById('form-auth');
const btnAuth = document.getElementById('btn-auth');
const tituloAuth = document.getElementById('titulo-auth');
const linkAlternar = document.getElementById('link-alternar');
const trocarTexto = document.getElementById('trocar-texto');

// Elementos novos do cadastro
const divNome = document.getElementById('campo-nome');
const divZap = document.getElementById('campo-whatsapp');
const inputNome = document.getElementById('nome-cadastro');
const inputZap = document.getElementById('zap-cadastro');

let modoLogin = true;

// LÓGICA: Alternar entre Login e Cadastro
linkAlternar.onclick = (e) => {
    e.preventDefault();
    modoLogin = !modoLogin;
    
    if (modoLogin) {
        // TELA DE LOGIN
        tituloAuth.innerText = "Entrar na Conta";
        btnAuth.innerText = "ENTRAR";
        trocarTexto.innerText = "Ainda não tem conta?";
        linkAlternar.innerText = "Cadastre-se";
        
        // Esconde campos extras
        divNome.style.display = "none";
        divZap.style.display = "none";
        inputNome.required = false;
        inputZap.required = false;
    } else {
        // TELA DE CADASTRO
        tituloAuth.innerText = "Criar Nova Conta";
        btnAuth.innerText = "CADASTRAR";
        trocarTexto.innerText = "Já tem uma conta?";
        linkAlternar.innerText = "Fazer Login";
        
        // Mostra campos extras
        divNome.style.display = "block";
        divZap.style.display = "block";
        inputNome.required = true;
        inputZap.required = true;
    }
};

// LÓGICA: Envio do Formulário
formAuth.onsubmit = (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const senha = document.getElementById('senha').value;

    if (modoLogin) {
        // FAZER LOGIN
        auth.signInWithEmailAndPassword(email, senha)
            .then(() => {
                window.location.href = "index.html";
            })
            .catch(error => {
                if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
                    alert("⚠️ E-mail ou senha incorretos.");
                } else {
                    alert("Erro ao entrar: " + error.message);
                }
            });
    } else {
        // FAZER CADASTRO
        const nome = inputNome.value;
        const zap = inputZap.value;

        // Limpa o número de WhatsApp (deixa só os números)
        let numLimpo = zap.replace(/\D/g, "");

        auth.createUserWithEmailAndPassword(email, senha)
            .then((credencial) => {
                const usuarioUID = credencial.user.uid;

                // Salva o Nome e WhatsApp no Banco de Dados atrelado ao UID do cliente
                return database.ref('clientes/' + usuarioUID).set({
                    nome: nome,
                    whatsapp: numLimpo,
                    email: email,
                    dataCadastro: new Date().toLocaleDateString('pt-BR')
                });
            })
            .then(() => {
                alert("🎉 Conta criada com sucesso! Bem-vindo(a).");
                window.location.href = "index.html";
            })
            .catch(error => {
                if (error.code === 'auth/email-already-in-use') {
                    alert("⚠️ Este e-mail já está cadastrado.");
                } else if (error.code === 'auth/weak-password') {
                    alert("⚠️ A senha deve ter pelo menos 6 caracteres.");
                } else {
                    alert("Erro ao cadastrar: " + error.message);
                }
            });
    }
};