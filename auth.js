// CONFIGURAÇÃO DO SEU FIREBASE (A mesma que você já usa)
const firebaseConfig = {
    apiKey: "SUA_API_KEY",
    authDomain: "barbearia-do-marcos.firebaseapp.com",
    projectId: "barbearia-do-marcos",
    storageBucket: "barbearia-do-marcos.appspot.com",
    messagingSenderId: "894105389352",
    appId: "1:894105389352:web:3a5a27602c0d589581e81d"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();

const formAuth = document.getElementById('form-auth');
const btnAuth = document.getElementById('btn-auth');
const tituloAuth = document.getElementById('titulo-auth');
const linkAlternar = document.getElementById('link-alternar');
const trocarTexto = document.getElementById('trocar-texto');

let modoLogin = true;

// Alternar entre Login e Cadastro
linkAlternar.onclick = (e) => {
    e.preventDefault();
    modoLogin = !modoLogin;
    
    if (modoLogin) {
        tituloAuth.innerText = "Entrar na Conta";
        btnAuth.innerText = "ENTRAR";
        trocarTexto.innerText = "Ainda não tem conta?";
        linkAlternar.innerText = "Cadastre-se";
    } else {
        tituloAuth.innerText = "Criar Nova Conta";
        btnAuth.innerText = "CADASTRAR";
        trocarTexto.innerText = "Já tem uma conta?";
        linkAlternar.innerText = "Fazer Login";
    }
};

// Lógica de Envio
formAuth.onsubmit = (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const senha = document.getElementById('senha').value;

    if (modoLogin) {
        auth.signInWithEmailAndPassword(email, senha)
            .then(() => {
                alert("Bem-vindo de volta!");
                window.location.href = "index.html";
            })
            .catch(error => alert("Erro: " + error.message));
    } else {
        auth.createUserWithEmailAndPassword(email, senha)
            .then(() => {
                alert("Conta criada com sucesso!");
                window.location.href = "index.html";
            })
            .catch(error => alert("Erro: " + error.message));
    }
};