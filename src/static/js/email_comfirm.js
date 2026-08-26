document.getElementById('signUp').addEventListener('click', function(e) {
    e.preventDefault();

    const userEmail = document.getElementById('user-email').value;
    const userPassword = document.getElementById('user-password').value;
    const emailResult = document.getElementById('confirm-result');

    const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/;

    if (!emailRegex.test(userEmail)) {
        emailResult.textContent = '올바른 이메일 형식이 아닙니다';
        emailResult.style.color = 'red';
        return;
    }

        axios.post('/api/login', {
        userEmail: userEmail,
        password: userPassword
    })
    .then(function(res) {
        if (res.data.success) {
            loginResult.textContent = "로그인에 성공했습니다!";
            loginResult.style.color = 'green';
            setTimeout(() => {
                window.location.href = '/dashboard';
            }, 1000);
        }
    })

    axios.post('/register', {
        userEmail: userEmail,
        password: userPassword
    })
    .then(function(res) {
        if (res.data.available) {
            emailResult.textContent = "사용 가능한 이메일 입니다.";
            emailResult.style.color = 'green';
            setTimeout(() => {
                window.location.href = '/login';
            }, 1000);
        } else {
            emailResult.textContent = "이미 등록된 이메일 입니다.";
            emailResult.style.color = 'red';
        }
    })
    .catch(function(err) {
        console.log('에러 발생:', err);
    })
});
