document.getElementById('signUp').addEventListener('click', function(e) {
    e.preventDefault();

    const userEmail = document.getElementById('user-email').value;
    const emailResult = document.getElementById('confirm-result');

    // 이메일 형식 검증을 위한 정규표현식
    const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/;

    if (!emailRegex.test(userEmail)) {
        emailResult.textContent = '올바른 이메일 형식이 아닙니다';
        emailResult.style.color = 'red';
        return;
    }

    axios.post('/register', {
        userEmail: userEmail
    })
    .then(function(res) {
        if (res.data.available) {
            emailResult.textContent = "사용 가능한 이메일 입니다.";
            emailResult.style.color = 'green';
        } else {
            emailResult.textContent = "이미 등록된 이메일 입니다.";
            emailResult.style.color = 'red';
        }
    })
    .catch(function(err) {
        console.log('에러 발생:', err);
    })
});