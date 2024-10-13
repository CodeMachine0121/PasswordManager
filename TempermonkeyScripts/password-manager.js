
    let apiData = [];
    let vaultUnsealedStatus = false;
    const backendUri = 'http://localhost:5210/api';

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
            console.log('檢測到帳號密碼輸入框!');
            const usernameField = usernameFields[0];
            const passwordField = passwordFields[0];

            usernameField.style.border = '2px solid blue';
            passwordField.style.border = '2px solid red';

            // 首先插入图标
            insertIcon(usernameField, passwordField);

            // 然后获取 Vault 状态和密码记录
            fetchVaultSealStatus()
                .then(() => {
                    if (!vaultUnsealedStatus) {
                        console.log('Vault is sealed. Password records will not be fetched.');
                        return Promise.resolve([]); // 返回一个解析为空数组的 Promise
                    }
                    return fetchPasswordRecord();
                })
                .catch(error => {
                    console.error('Error in initialization:', error);
                    // 即使出错，我们也不移除图标，因为用户可能想要手动解封 Vault
                });
        }
    }

    function insertIcon(usernameField, passwordField) {
        const icon = document.createElement('span');
        icon.innerHTML = '🔑';
        icon.style.cssText = 'cursor: pointer; margin-left: 5px;';
        icon.title = '查看已儲存帳密';

        icon.onclick = () => {
            if (!vaultUnsealedStatus) {
                showVaultKeyInput(usernameField, passwordField);
            } else {
                if (apiData.length > 0) {
                    showPopup(apiData, usernameField, passwordField);
                } else {
                    alert('沒有紀錄，你可以新增一個');
                    showCreateForm(null, usernameField, passwordField);
                }
            }
        };
        usernameField.parentNode.insertBefore(icon, usernameField.nextSibling);
    }



    function showVaultKeyInput(usernameField, passwordField) {
        const popup = document.createElement('div');
        popup.style.cssText = styles.popup;
        popup.id = 'vault-key-input';

        popup.innerHTML = `
            <h2>輸入Vault Unsealed Key</h2>
            <input type="password" id="vaultKey" style="${styles.input}" placeholder="輸入你的Vault Unsealed Key">
            <button id="submitVaultKey" style="${styles.button}">提交</button>
        `;

        const submitButton = popup.querySelector('#submitVaultKey');
        submitButton.onclick = () => {
            const keyInput = popup.querySelector('#vaultKey');
            requestUnsealVault(keyInput.value)
                .then(success => {
                    if (success) {
                        return fetchPasswordRecord();
                    } else {
                        throw new Error('Key is not correct');
                    }
                })
                .then(() => {
                    document.body.removeChild(popup);
                    showPopup(apiData, usernameField, passwordField);
                })
                .catch(error => {
                    console.error('Error:', error);
                    alert(error.message || 'An error occurred. Please try again.');
                });
        };

        document.body.appendChild(popup);
    }


    function showPopup(data, usernameField, passwordField) {
        const popup = document.createElement('div');
        popup.style.cssText = styles.popup;
        popup.id = 'password-manager-popup';

        const title = document.createElement('h2');
        title.textContent = '可用帳密';
        title.style.marginTop = '30px';
        popup.appendChild(title);

        data.forEach((item, index) => {
            const credentialItem = document.createElement('div');
            credentialItem.style.cssText = styles.credentialItem;

            credentialItem.innerHTML = `
                <p><strong>網站域名:</strong> ${item.domainName}</p>
                <p><strong>帳號:</strong> ${item.accountName}</p>
                <p><strong>密碼:</strong> <span class="password-field" style="filter: blur(5px);">${item.password}</span></p>
            `;

            const toggleButton = document.createElement('button');
            toggleButton.textContent = '顯示/隐藏';
            toggleButton.style.cssText = styles.button;
            toggleButton.onclick = () => togglePassword(credentialItem.querySelector('.password-field'));

            const useButton = document.createElement('button');
            useButton.textContent = '使用這個';
            useButton.style.cssText = styles.button;
            useButton.onclick = () => {
                fillCredentials(index, usernameField, passwordField);
                document.body.removeChild(popup);
            };

            const deleteIcon = document.createElement('span');
            deleteIcon.innerHTML = '🗑️';
            deleteIcon.title = '刪除紀錄';
            deleteIcon.style.cssText = styles.deleteIcon;
            deleteIcon.onclick = () => {
                if (confirm('確定要刪除齁？')) {
                    deleteCredential(item, index, popup, usernameField, passwordField);
                }
            };

            credentialItem.appendChild(deleteIcon);
            credentialItem.appendChild(toggleButton);
            credentialItem.appendChild(useButton);
            popup.appendChild(credentialItem);
        });

        const createNewButton = document.createElement('button');
        createNewButton.textContent = '建立新紀錄';
        createNewButton.style.cssText = styles.button;
        createNewButton.onclick = () => showCreateForm(popup, usernameField, passwordField);

        const closeButton = document.createElement('button');
        closeButton.textContent = '關閉';
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
            <h2>新增紀錄</h2>
            <form id="createCredentialForm">
                <label for="domainName">網站域名:</label><br>
                <input type="text" id="domainName" name="domainName" value="${window.location.hostname}" readonly style="${styles.input}"><br>
                <label for="accountName">帳號:</label><br>
                <input type="text" id="accountName" name="accountName" value="${usernameField.value}" required style="${styles.input}"><br>
                <label for="password">密碼:</label><br>
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
            url: `${backendUri}/PasswordRecord/domain/${newPasswordRecord.domainName}`,
            headers: {
                'Content-Type': 'application/json'
            },
            data: JSON.stringify({
                accountName: newPasswordRecord.accountName,
                password: newPasswordRecord.password
            }),
            onload: function(response) {
                if (response.status >= 200 && response.status < 300) {
                    console.log('新增成功:', response.responseText);
                    alert('Password record created');

                    apiData.push(newPasswordRecord);
                    usernameField.value = newPasswordRecord.accountName;
                    passwordField.value = newPasswordRecord.password;
                    document.body.removeChild(popup);
                } else {
                    console.error('Password record created fail (cause backend side):', response.statusText);
                    alert(`新增失敗: ${response.statusText}`);
                }
            },
            onerror: function(error) {
                console.error('create password error: ', error);
                alert(`建立失敗失败: ${error.toString()}`);
            }
        });
    }

    function fetchPasswordRecord() {
        return new Promise((resolve, reject) => {
            GM.xmlHttpRequest({
                method: 'GET',
                url: `${backendUri}/PasswordRecord/domain/${window.location.hostname}`,
                onload: function(response) {
                    if (response.status >= 200 && response.status < 300) {
                        const data = JSON.parse(response.responseText);
                        console.log('API get，data：', data);
                        apiData = data.data;
                        resolve(apiData);
                    } else {
                        console.error('API get fail:', response.statusText);
                        apiData = [];
                        reject(new Error(`紀錄取得失敗: ${response.statusText}`));
                    }
                },
                onerror: function(error) {
                    console.error('API get fail', error);
                    apiData = [];
                    reject(new Error(`紀錄取得失敗: ${error.toString()}`));
                }
            });
        });
    }


    function deleteCredential(selectedPasswordRecord, index, popup, usernameField, passwordField) {
        GM.xmlHttpRequest({
            method: 'DELETE',
            url: `${backendUri}/PasswordRecord/domain/${selectedPasswordRecord.domainName}/account/${selectedPasswordRecord.accountName}`,
            onload: function(response) {
                if (response.status >= 200 && response.status < 300) {
                    console.log('删除成功');
                    alert('已删除');
                    apiData.splice(index, 1);
                    document.body.removeChild(popup);
                    showPopup(apiData, usernameField, passwordField);
                } else {
                    console.error('删除失败:', response.statusText);
                    alert(`删除失败: ${response.statusText}`);
                }
            },
            onerror: function(error) {
                console.error('刪除失敗:', error);
                alert(`删除失败: ${error.toString()}`);
            }
        });
    }

    function fetchVaultSealStatus() {
        return new Promise((resolve, reject) => {
            GM.xmlHttpRequest({
                method: 'GET',
                url: `${backendUri}/Vault/seal/status`,
                onload: function(response) {
                    if (response.status >= 200 && response.status < 300) {
                        const data = JSON.parse(response.responseText);
                        console.log('vault sealed status', data);
                        vaultUnsealedStatus = !data.data.sealed;
                        console.log('vaultUnsealedStatus:', vaultUnsealedStatus);
                        resolve(vaultUnsealedStatus);
                    } else {
                        console.error('API get fail:', response.statusText);
                        vaultUnsealedStatus = false;
                        reject(new Error(`获取Vault状态失败: ${response.statusText}`));
                    }
                },
                onerror: function(error) {
                    console.error('API get fail', error);
                    vaultUnsealedStatus = false;
                    reject(error);
                }
            });
        });
    }

    function requestUnsealVault(vaultKey) {
        return new Promise((resolve, reject) => {
            GM.xmlHttpRequest({
                method: 'POST',
                url: `${backendUri}/Vault/seal/unseal`,
                headers: {
                    'Content-Type': 'application/json'
                },
                data: JSON.stringify({
                    key: vaultKey
                }),
                onload: function(response) {
                    if (response.status >= 200 && response.status < 300) {
                        console.log('vault key send success:', response.responseText);
                        vaultUnsealedStatus = true;
                        resolve(true);
                    } else {
                        console.error('vault key send fail:', response.statusText);
                        vaultUnsealedStatus = false;
                        resolve(false);
                    }
                },
                onerror: function(error) {
                    console.error('error when send vault key: ', error);
                    vaultUnsealedStatus = false;
                    reject(error);
                }
            });
        });
    }
