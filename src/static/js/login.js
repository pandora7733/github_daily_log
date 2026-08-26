document.getElementById('signIn').addEventListener('click', function(e) {
    e.preventDefault();

    const userEmail = document.querySelector('input[type="email"]').value;
    const userPassword = document.querySelector('input[type="password"]').value;

    axios.post('/api/login', {
        userEmail: userEmail,
        password: userPassword
    })
    .then(function(res) {

        if (res.data.success) {
            window.location.href = '/dashboard';
        } else {
            alert('이메일 또는 비밀번호가 잘못되었습니다.');
        }

    })
    .catch(function(err) {

        console.log('로그인 에러:', err);

        if (err.response && err.response.status === 401) {
            alert('이메일 또는 비밀번호가 잘못되었습니다.');
        } else {
            alert('로그인 중 오류가 발생했습니다.');
        }

    });
});

document.getElementById('signUp').addEventListener('click', function(e) {
    e.preventDefault();

    const userEmail = document.querySelector('input[type="email"]').value;
    const userPassword = document.querySelector('input[type="password"]').value;

    if (!userEmail || !userPassword) {
        alert('이메일과 비밀번호를 모두 입력해 주세요.');
        return;
    }

    axios.post('/register', {
        userEmail: userEmail,
        password: userPassword
    })
    .then(function(res) {
        if (res.data.available) {
            alert('회원가입이 완료되었습니다! 로그인해 주세요.');
            window.location.href = '/login';
        } else {
            alert('이미 존재하는 이메일입니다.');
        }
    })
    .catch(function(err) {
        console.error('회원가입 에러:', err);
        alert('회원가입 처리 중 서버 오류가 발생했습니다.');
    });
});
