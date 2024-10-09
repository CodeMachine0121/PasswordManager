// ==UserScript==
// @name         Password Manager
// @namespace    http://tampermonkey.net/
// @version      2024-10-19
// @description  Password management with improved UX and inline button creation
// @author       You
// @match        *://*/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=claude.ai
// @grant        GM.xmlHttpRequest
// @grant        GM_xmlhttpRequest
// ==/UserScript==

(function() {
    'use strict';

    let apiData = [];
    const backendUri = 'http://localhost:5210/api/PasswordRecord';

    // 样式对象
    const styles = {
        popup: `
            position: fixed;
            left: 50%;
            top: 50%;
            transform: translate(-50%, -50%);
            background-color: white;
            padding: 20px;
            border: 1px solid black;
            border-radius: 5px;
            z-index: 9999;
            max-height: 80vh;
            overflow-y: auto;
            min-width: 300px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        `,
        button: `
            cursor: pointer;
            padding: 5px 10px;
            margin: 5px;
            border: none;
            border-radius: 3px;
            background-color: #4CAF50;
            color: white;
        `,
        input: `
            width: 100%;
            padding: 5px;
            margin: 5px 0;
        `,
        credentialItem: `
            margin-bottom: 10px;
            padding: 10px;
            border: 1px solid #ccc;
            border-radius: 3px;
        `
    };

    function detectPasswordFields() {
        const passwordFields = document.querySelectorAll('input[type="password"]');
        const usernameFields = document.querySelectorAll('input[type="text"], input[type="email"]');

        if (passwordFields.length > 0 && usernameFields.length > 0) {
            console.log('账号密码输入框已检测到!');
            const usernameField = usernameFields[0];
            const passwordField = passwordFields[0];

            usernameField.style.border = '2px solid blue';
            passwordField.style.border = '2px solid red';

            fetchPasswordRecord();
            insertIcon(usernameField, passwordField);
        }
    }

    function insertIcon(usernameField, passwordField) {
        const icon = document.createElement('span');
        icon.innerHTML = '🔑';
        icon.style.cssText = 'cursor: pointer; margin-left: 5px;';
        icon.title = '点击查看密码';

        icon.onclick = () => {
            if (apiData.length > 0) {
                console.log('显示密码列表');
                showPopup(apiData, usernameField, passwordField);
            } else {
                console.log('没有找到密码记录');
                alert('没有找到密码记录，您可以创建新的密码记录。');
                showCreateForm(null, usernameField, passwordField);
            }
        };
        usernameField.parentNode.insertBefore(icon, usernameField.nextSibling);
    }

    function showPopup(data, usernameField, passwordField) {
        const popup = document.createElement('div');
        popup.style.cssText = styles.popup;
        popup.id = 'password-manager-popup';

        const title = document.createElement('h2');
        title.textContent = '可用凭证';
        title.style.marginTop = '30px';
        popup.appendChild(title);

        data.forEach((item, index) => {
            const credentialItem = document.createElement('div');
            credentialItem.style.cssText = styles.credentialItem;

            credentialItem.innerHTML = `
                <p><strong>域名:</strong> ${item.domainName}</p>
                <p><strong>账户名:</strong> ${item.accountName}</p>
                <p><strong>密码:</strong> <span class="password-field" style="filter: blur(5px);">${item.password}</span></p>
            `;

            const toggleButton = document.createElement('button');
            toggleButton.textContent = '显示/隐藏';
            toggleButton.style.cssText = styles.button;
            toggleButton.onclick = () => togglePassword(credentialItem.querySelector('.password-field'));

            const useButton = document.createElement('button');
            useButton.textContent = '使用这个';
            useButton.style.cssText = styles.button;
            useButton.onclick = () => {
                fillCredentials(index, usernameField, passwordField);
                document.body.removeChild(popup);
            };

            const deleteIcon = document.createElement('span');
            deleteIcon.innerHTML = '🗑️';
            deleteIcon.title = '删除这条记录';
            deleteIcon.style.cssText = styles.deleteIcon;
            deleteIcon.onclick = () => {
                if (confirm('确定要删除这条记录吗？')) {
                    deleteCredential(item, index, popup, usernameField, passwordField);
                }
            };

            credentialItem.appendChild(deleteIcon);
            credentialItem.appendChild(toggleButton);
            credentialItem.appendChild(useButton);
            popup.appendChild(credentialItem);
        });

        const createNewButton = document.createElement('button');
        createNewButton.textContent = '创建新记录';
        createNewButton.style.cssText = styles.button;
        createNewButton.onclick = () => showCreateForm(popup, usernameField, passwordField);

        const closeButton = document.createElement('button');
        closeButton.textContent = '关闭';
        closeButton.style.cssText = styles.button;
        closeButton.onclick = () => document.body.removeChild(popup);

        popup.appendChild(createNewButton);
        popup.appendChild(closeButton);

        document.body.appendChild(popup);
    }

    function togglePassword(passwordElement) {
        passwordElement.style.filter = passwordElement.style.filter === 'blur(5px)' ? 'none' : 'blur(5px)';
    }

    function fillCredentials(index, usernameField, passwordField) {
        const selectedData = apiData[index];
        usernameField.value = selectedData.accountName;
        passwordField.value = selectedData.password;
    }

    function showCreateForm(popup, usernameField, passwordField) {
        const formPopup = popup || document.createElement('div');
        formPopup.style.cssText = styles.popup;
        formPopup.id = 'password-manager-form';
        formPopup.innerHTML = `
            <h2>创建新凭证</h2>
            <form id="createCredentialForm">
                <label for="domainName">域名:</label><br>
                <input type="text" id="domainName" name="domainName" value="${window.location.hostname}" readonly style="${styles.input}"><br>
                <label for="accountName">账户名:</label><br>
                <input type="text" id="accountName" name="accountName" value="${usernameField.value}" required style="${styles.input}"><br>
                <label for="password">密码:</label><br>
                <input type="password" id="password" name="password" value="${passwordField.value}" required style="${styles.input}"><br><br>
            </form>
        `;

        const form = formPopup.querySelector('#createCredentialForm');
        const saveButton = document.createElement('button');
        saveButton.textContent = '保存';
        saveButton.style.cssText = styles.button;
        saveButton.onclick = (e) => {
            e.preventDefault();
            const newPasswordRecord = {
                domainName: form.domainName.value,
                accountName: form.accountName.value,
                password: form.password.value
            };
            createCredential(newPasswordRecord, formPopup, usernameField, passwordField);
        };
        form.appendChild(saveButton);

        const backButton = document.createElement('button');
        backButton.textContent = '返回';
        backButton.style.cssText = styles.button;
        backButton.onclick = () => {
            if (popup) {
                showPopup(apiData, usernameField, passwordField);
            } else {
                document.body.removeChild(formPopup);
            }
        };
        formPopup.appendChild(backButton);

        if (!popup) {
            document.body.appendChild(formPopup);
        }
    }

    function createCredential(newPasswordRecord, popup, usernameField, passwordField) {
        GM.xmlHttpRequest({
            method: 'POST',
            url: `${backendUri}/domain/${newPasswordRecord.domainName}`,
            headers: {
                'Content-Type': 'application/json'
            },
            data: JSON.stringify({
                accountName: newPasswordRecord.accountName,
                password: newPasswordRecord.password
            }),
            onload: function(response) {
                if (response.status >= 200 && response.status < 300) {
                    console.log('新凭证创建成功:', response.responseText);
                    alert('新凭证已创建');

                    apiData.push(newPasswordRecord);
                    usernameField.value = newPasswordRecord.accountName;
                    passwordField.value = newPasswordRecord.password;
                    document.body.removeChild(popup);
                } else {
                    console.error('创建凭证失败:', response.statusText);
                    alert(`创建凭证失败: ${response.statusText}`);
                }
            },
            onerror: function(error) {
                console.error('创建凭证时发生错误:', error);
                alert(`创建凭证失败: ${error.toString()}`);
            }
        });
    }

    function fetchPasswordRecord() {
        GM.xmlHttpRequest({
            method: 'GET',
            url: `${backendUri}/domain/${window.location.hostname}`,
            onload: function(response) {
                if (response.status >= 200 && response.status < 300) {
                    const data = JSON.parse(response.responseText);
                    console.log('API调用成功，数据：', data);
                    apiData = data.data;
                } else {
                    console.error('API调用失败:', response.statusText);
                    apiData = [];
                    alert(`获取密码记录失败: ${response.statusText}`);
                }
            },
            onerror: function(error) {
                console.error('API调用错误:', error);
                apiData = [];
                alert(`获取密码记录失败: ${error.toString()}`);
            }
        });
    }

    function deleteCredential(selectedPasswordRecord, index, popup, usernameField, passwordField) {
        GM.xmlHttpRequest({
            method: 'DELETE',
            url: `${backendUri}/domain/${selectedPasswordRecord.domainName}/account/${selectedPasswordRecord.accountName}`,
            onload: function(response) {
                if (response.status >= 200 && response.status < 300) {
                    console.log('凭证删除成功');
                    alert('凭证已删除');
                    apiData.splice(index, 1);
                    document.body.removeChild(popup);
                    showPopup(apiData, usernameField, passwordField);
                } else {
                    console.error('删除凭证失败:', response.statusText);
                    alert(`删除凭证失败: ${response.statusText}`);
                }
            },
            onerror: function(error) {
                console.error('删除凭证时发生错误:', error);
                alert(`删除凭证失败: ${error.toString()}`);
            }
        });
    }

    window.addEventListener('load', detectPasswordFields);
})();