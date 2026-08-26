document.addEventListener('DOMContentLoaded', function() {
    const userPwd = document.getElementById('user-password');
    const userRepwd = document.getElementById('user-password-confirm');
    const pwdResult = document.getElementById('pwd-result');

    function checkPasswordMatch() {
        if (userRepwd.value === '') {
            pwdResult.textContent = '';
        }
        else if (userPwd.value === userRepwd.value) {
            pwdResult.textContent = "비밀번호가 일치합니다.";
            pwdResult.style.color = "green";
        }
        else {
            pwdResult.textContent = "비밀번호가 일치하지 않습니다.";
            pwdResult.style.color = "red";
        }
    }

    userPwd.addEventListener('input', checkPasswordMatch);
    userRepwd.addEventListener('input', checkPasswordMatch);
});