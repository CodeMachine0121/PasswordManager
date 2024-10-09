// ==UserScript==
// @name         New Userscript
// @namespace    http://tampermonkey.net/
// @version      2024-10-08
// @description  try to take over the world!
// @author       You
// @match        *://*/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=claude.ai
// @grant        none
// ==/UserScript==

(function() {
    'use strict';
    // TODO: should show pop-up when click icon


    function detectPasswordFields() {
        const passwordFields = document.querySelectorAll('input[type="password"]');
        const usernameFields = document.querySelectorAll('input[type="text"], input[type="email"]');

        if (passwordFields.length > 0 && usernameFields.length > 0) {
            console.log('账号密码输入框已检测到!');
            const usernameField = usernameFields[0];
            const passwordField = passwordFields[0];

            usernameField.style.border = '2px solid blue';
            passwordField.style.border = '2px solid red';


            insertIcon(usernameField, passwordField);
        }
    }

    function insertIcon(usernameField, passwordField) {
        const icon = document.createElement('span');
        icon.innerHTML = '🔑'; // 使用一个键的emoji作为图标
        icon.style.cursor = 'pointer';
        icon.style.marginLeft = '5px';
        icon.title = '点击自动填充';

        icon.addEventListener('click', () => {
            let apiData = callApi()[];
            
            
            if (apiData) {
                usernameField.value = apiData.accountName;
                passwordField.value = apiData.password;
            } else {
                console.log('API数据尚未加载，请稍后再试');
            }
        });
        usernameField.parentNode.insertBefore(icon, usernameField.nextSibling);
    }

    function callApi() {
        let result = null;

        fetch('http://localhost:5210/api/PasswordRecord/domain/test.com')
            .then(response => {
                if (!response.ok) {
                    throw new Error('网络响应不正常');
                }
                return response.json();
            })
            .then(data => {
                console.log('API调用成功，数据：', data);
                result = data;
                // 在这里处理API返回的数据
            })
            .catch(error => {
                console.error('API调用失败：', error);
            });
        return result;
    }

    // 在页面加载完成后运行检测
    window.addEventListener('load', detectPasswordFields);

    // 每5秒重新检查一次,以防动态加载的内容
    //setInterval(detectPasswordFields, 5000);
})();