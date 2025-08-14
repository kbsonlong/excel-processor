// 全局变量
let currentWorkbook = null;
let currentData = null;
let currentFileName = '';
let currentSheetName = '';

// DOM元素
const fileInput = document.getElementById('excel_file');
const splitKeyInput = document.getElementById('split_key');
const multCheckbox = document.getElementById('mult');
const processBtn = document.getElementById('process_btn');
const previewSection = document.getElementById('preview_section');
const resultSection = document.getElementById('result_section');
const errorSection = document.getElementById('error_section');
const sheetSelection = document.getElementById('sheet_selection');
const sheetSelect = document.getElementById('sheet_select');

// 初始化事件监听器
document.addEventListener('DOMContentLoaded', function() {
    fileInput.addEventListener('change', handleFileSelect);
    processBtn.addEventListener('click', processExcelFile);
    splitKeyInput.addEventListener('input', validateForm);
    sheetSelect.addEventListener('change', handleSheetSelect);
});

// 处理文件选择
function handleFileSelect(event) {
    const file = event.target.files[0];
    if (!file) {
        resetUI();
        return;
    }

    // 验证文件类型
    const validTypes = ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 
                       'application/vnd.ms-excel'];
    if (!validTypes.includes(file.type) && !file.name.match(/\.(xlsx|xls)$/i)) {
        showError('请选择有效的Excel文件 (.xlsx 或 .xls)');
        return;
    }

    currentFileName = file.name;
    
    // 更新文件输入样式
    const wrapper = fileInput.closest('.file-input-wrapper');
    wrapper.classList.add('has-file');
    const label = wrapper.querySelector('.file-text');
    label.textContent = file.name;

    // 读取并预览文件
    readExcelFile(file);
}

// 读取Excel文件
function readExcelFile(file) {
    const reader = new FileReader();
    
    reader.onload = function(e) {
        try {
            const data = new Uint8Array(e.target.result);
            currentWorkbook = XLSX.read(data, { type: 'array' });
            
            // 检查是否有工作表
            if (!currentWorkbook.SheetNames || currentWorkbook.SheetNames.length === 0) {
                showError('Excel文件中没有找到任何工作表');
                return;
            }
            
            // 重置界面状态
            hidePreview();
            hideError();
            
            // 检查是否有多个工作表
            if (currentWorkbook.SheetNames.length > 1) {
                // 显示工作表选择器
                showSheetSelector();
            } else {
                // 只有一个工作表，直接加载
                currentSheetName = currentWorkbook.SheetNames[0];
                loadSheetData(currentSheetName);
            }
            
        } catch (error) {
            console.error('读取Excel文件时出错:', error);
            showError('读取Excel文件时出错，请确保文件格式正确');
        }
    };
    
    reader.onerror = function() {
        showError('文件读取失败，请重试');
    };
    
    reader.readAsArrayBuffer(file);
}

// 显示工作表选择器
function showSheetSelector() {
    // 清空选择器
    sheetSelect.innerHTML = '<option value="">请选择工作表...</option>';
    
    // 添加所有工作表选项
    currentWorkbook.SheetNames.forEach(sheetName => {
        const option = document.createElement('option');
        option.value = sheetName;
        option.textContent = sheetName;
        sheetSelect.appendChild(option);
    });
    
    // 显示工作表选择区域
    sheetSelection.style.display = 'block';
    validateForm();
}

// 处理工作表选择
function handleSheetSelect(event) {
    const selectedSheet = event.target.value;
    if (selectedSheet) {
        currentSheetName = selectedSheet;
        loadSheetData(selectedSheet);
    } else {
        hidePreview();
        validateForm();
    }
}

// 加载指定工作表的数据
function loadSheetData(sheetName) {
    try {
        const worksheet = currentWorkbook.Sheets[sheetName];
        
        // 转换为JSON数据
        currentData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        
        if (currentData.length === 0) {
            showError(`工作表 "${sheetName}" 中没有数据，请检查文件内容`);
            return;
        }
        
        // 显示预览
        showPreview();
        hideError();
        validateForm();
        
    } catch (error) {
        console.error('加载工作表数据时出错:', error);
        showError(`加载工作表 "${sheetName}" 时出错`);
    }
}

// 隐藏预览区域
function hidePreview() {
    previewSection.style.display = 'none';
    resultSection.style.display = 'none';
    sheetSelection.style.display = 'none';
}

// 显示文件预览
function showPreview() {
    if (!currentData || currentData.length === 0) return;
    
    // 更新文件信息
    document.getElementById('file_name').textContent = currentFileName;
    document.getElementById('sheet_name').textContent = currentSheetName;
    document.getElementById('total_rows').textContent = currentData.length;
    document.getElementById('total_cols').textContent = currentData[0] ? currentData[0].length : 0;
    
    // 创建预览表格（显示前10行）
    const table = document.getElementById('preview_table');
    table.innerHTML = '';
    
    const maxRows = Math.min(11, currentData.length); // 表头 + 最多10行数据
    
    for (let i = 0; i < maxRows; i++) {
        const row = table.insertRow();
        const rowData = currentData[i] || [];
        
        for (let j = 0; j < Math.min(10, rowData.length); j++) { // 最多显示10列
            const cell = i === 0 ? document.createElement('th') : row.insertCell();
            cell.textContent = rowData[j] || '';
            if (i === 0) row.appendChild(cell);
        }
        
        // 如果列数超过10，添加省略号
        if (rowData.length > 10) {
            const cell = i === 0 ? document.createElement('th') : row.insertCell();
            cell.textContent = '...';
            cell.style.fontStyle = 'italic';
            cell.style.color = '#999';
            if (i === 0) row.appendChild(cell);
        }
    }
    
    // 如果行数超过10，添加提示
    if (currentData.length > 11) {
        const row = table.insertRow();
        const cell = row.insertCell();
        cell.colSpan = Math.min(10, currentData[0].length) + (currentData[0].length > 10 ? 1 : 0);
        cell.textContent = `... 还有 ${currentData.length - 11} 行数据`;
        cell.style.textAlign = 'center';
        cell.style.fontStyle = 'italic';
        cell.style.color = '#999';
        cell.style.padding = '15px';
    }
    
    // 显示可用列名
    showAvailableColumns();
    
    // 显示预览区域
    previewSection.style.display = 'block';
}

// 显示可用列名
function showAvailableColumns() {
    const columnsList = document.getElementById('columns_list');
    columnsList.innerHTML = '';
    
    if (!currentData || currentData.length === 0) return;
    
    const headers = currentData[0] || [];
    
    headers.forEach((header, index) => {
        if (header && header.toString().trim()) {
            const tag = document.createElement('span');
            tag.className = 'column-tag';
            tag.textContent = header;
            tag.addEventListener('click', () => {
                splitKeyInput.value = header;
                validateForm();
            });
            columnsList.appendChild(tag);
        }
    });
}

// 验证表单
function validateForm() {
    const hasFile = fileInput.files.length > 0;
    const hasSplitKey = splitKeyInput.value.trim() !== '';
    const hasValidSheet = currentData && currentSheetName;
    
    // 如果有多个工作表，需要选择工作表
    const needsSheetSelection = currentWorkbook && currentWorkbook.SheetNames.length > 1;
    const hasSheetSelected = !needsSheetSelection || sheetSelect.value !== '';
    
    processBtn.disabled = !(hasFile && hasSplitKey && hasValidSheet && hasSheetSelected);
}

// 处理Excel文件
function processExcelFile() {
    if (!currentData || !currentWorkbook) {
        showError('请先选择一个有效的Excel文件');
        return;
    }
    
    const splitKey = splitKeyInput.value.trim();
    if (!splitKey) {
        showError('请输入拆分键（列名）');
        return;
    }
    
    // 显示加载状态
    showLoading(true);
    hideError();
    
    try {
        // 获取表头
        const headers = currentData[0] || [];
        const splitKeyIndex = headers.findIndex(header => 
            header && header.toString().trim() === splitKey
        );
        
        if (splitKeyIndex === -1) {
            throw new Error(`指定的拆分键 "${splitKey}" 不存在于Excel文件中，请检查输入`);
        }
        
        // 获取数据行（排除表头）
        const dataRows = currentData.slice(1);
        
        if (dataRows.length === 0) {
            // 获取当前工作表名称
            const currentSheetName = currentWorkbook.SheetNames[0] || 'Sheet1';
            throw new Error(`工作表 "${currentSheetName}" 中没有数据行（除表头外），请检查文件内容`);
        }
        
        // 按拆分键分组数据
        const groupedData = {};
        
        dataRows.forEach((row, index) => {
            const keyValue = row[splitKeyIndex];
            if (keyValue !== undefined && keyValue !== null && keyValue !== '') {
                const key = keyValue.toString().trim();
                if (!groupedData[key]) {
                    groupedData[key] = [];
                }
                groupedData[key].push(row);
            }
        });
        
        const groupKeys = Object.keys(groupedData);
        if (groupKeys.length === 0) {
            throw new Error(`拆分键 "${splitKey}" 列中没有有效数据`);
        }
        
        // 生成文件
        const isMultiFile = multCheckbox.checked;
        const downloadLinks = [];
        
        if (isMultiFile) {
            // 生成多个文件
            groupKeys.forEach(key => {
                const wb = XLSX.utils.book_new();
                const wsData = [headers, ...groupedData[key]];
                const ws = XLSX.utils.aoa_to_sheet(wsData);
                XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
                
                const fileName = `${sanitizeFileName(key)}.xlsx`;
                const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
                const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
                
                downloadLinks.push({
                    fileName: fileName,
                    blob: blob,
                    size: formatFileSize(blob.size),
                    groupKey: key,
                    rowCount: groupedData[key].length
                });
            });
        } else {
            // 生成单个文件，多个工作表
            const wb = XLSX.utils.book_new();
            
            groupKeys.forEach(key => {
                const wsData = [headers, ...groupedData[key]];
                const ws = XLSX.utils.aoa_to_sheet(wsData);
                const sheetName = sanitizeSheetName(key);
                XLSX.utils.book_append_sheet(wb, ws, sheetName);
            });
            
            const fileName = `${splitKey}-${currentFileName}`;
            const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
            const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            
            downloadLinks.push({
                fileName: fileName,
                blob: blob,
                size: formatFileSize(blob.size),
                groupKey: '合并文件',
                rowCount: dataRows.length
            });
        }
        
        // 显示结果
        showResults({
            splitMethod: isMultiFile ? '多个Excel文件' : '单个Excel文件（多工作表）',
            splitKey: splitKey,
            fileCount: downloadLinks.length,
            downloadLinks: downloadLinks
        });
        
    } catch (error) {
        console.error('处理文件时出错:', error);
        showError(error.message || '处理文件时出现未知错误');
    } finally {
        showLoading(false);
    }
}

// 显示结果
function showResults(result) {
    // 更新结果信息
    document.getElementById('split_method').textContent = result.splitMethod;
    document.getElementById('used_split_key').textContent = result.splitKey;
    document.getElementById('file_count').textContent = result.fileCount;
    
    // 生成下载链接
    const downloadLinksContainer = document.getElementById('download_links');
    downloadLinksContainer.innerHTML = '';
    
    result.downloadLinks.forEach((link, index) => {
        const downloadItem = document.createElement('div');
        downloadItem.className = 'download-item';
        
        downloadItem.innerHTML = `
            <div class="download-info">
                <div class="download-filename">${link.fileName}</div>
                <div class="download-size">大小: ${link.size} | 数据行数: ${link.rowCount}</div>
            </div>
            <a href="#" class="download-btn" data-index="${index}">下载文件</a>
        `;
        
        // 添加下载事件
        const downloadBtn = downloadItem.querySelector('.download-btn');
        downloadBtn.addEventListener('click', (e) => {
            e.preventDefault();
            downloadFile(link.blob, link.fileName);
        });
        
        downloadLinksContainer.appendChild(downloadItem);
    });
    
    // 显示结果区域
    resultSection.style.display = 'block';
    
    // 弹出处理完成提示框
    showProcessCompleteDialog(result, () => {
        // 用户确认后，平滑滚动到结果区域
        resultSection.scrollIntoView({ behavior: 'smooth' });
    });
}

// 显示处理完成提示框
function showProcessCompleteDialog(result, onConfirm) {
    // 创建模态框
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>✅ 处理完成</h3>
            </div>
            <div class="modal-body">
                <p>Excel文件已成功处理完成！</p>
                <div class="result-summary">
                    <p><strong>拆分方式：</strong>${result.splitMethod}</p>
                    <p><strong>拆分键：</strong>${result.splitKey}</p>
                    <p><strong>生成文件数：</strong>${result.fileCount} 个</p>
                </div>
                <p>点击确定查看下载链接</p>
            </div>
            <div class="modal-footer">
                <button class="confirm-btn" id="confirmBtn">确定</button>
            </div>
        </div>
    `;
    
    // 添加样式
    if (!document.getElementById('modal-styles')) {
        const style = document.createElement('style');
        style.id = 'modal-styles';
        style.textContent = `
            .modal-overlay {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background-color: rgba(0, 0, 0, 0.5);
                display: flex;
                justify-content: center;
                align-items: center;
                z-index: 1000;
                animation: fadeIn 0.3s ease-out;
            }
            
            .modal-content {
                background: white;
                border-radius: 12px;
                box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
                max-width: 500px;
                width: 90%;
                max-height: 80vh;
                overflow-y: auto;
                animation: slideIn 0.3s ease-out;
            }
            
            .modal-header {
                padding: 20px 24px 0;
                text-align: center;
            }
            
            .modal-header h3 {
                margin: 0;
                color: #2c3e50;
                font-size: 1.5em;
            }
            
            .modal-body {
                padding: 20px 24px;
                text-align: center;
            }
            
            .modal-body p {
                margin: 10px 0;
                color: #555;
                line-height: 1.6;
            }
            
            .result-summary {
                background: #f8f9fa;
                border-radius: 8px;
                padding: 15px;
                margin: 15px 0;
                text-align: left;
            }
            
            .result-summary p {
                margin: 8px 0;
                font-size: 0.95em;
            }
            
            .modal-footer {
                padding: 0 24px 24px;
                text-align: center;
            }
            
            .confirm-btn {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                border: none;
                padding: 12px 30px;
                border-radius: 25px;
                font-size: 1em;
                font-weight: 500;
                cursor: pointer;
                transition: all 0.3s ease;
                min-width: 120px;
            }
            
            .confirm-btn:hover {
                transform: translateY(-2px);
                box-shadow: 0 5px 15px rgba(102, 126, 234, 0.4);
            }
            
            @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }
            
            @keyframes slideIn {
                from {
                    opacity: 0;
                    transform: translateY(-50px) scale(0.9);
                }
                to {
                    opacity: 1;
                    transform: translateY(0) scale(1);
                }
            }
        `;
        document.head.appendChild(style);
    }
    
    // 添加到页面
    document.body.appendChild(modal);
    
    // 绑定确认按钮事件
    const confirmBtn = modal.querySelector('#confirmBtn');
    confirmBtn.addEventListener('click', () => {
        document.body.removeChild(modal);
        if (onConfirm) {
            onConfirm();
        }
    });
    
    // 点击背景关闭
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            document.body.removeChild(modal);
            if (onConfirm) {
                onConfirm();
            }
        }
    });
    
    // ESC键关闭
    const handleEsc = (e) => {
        if (e.key === 'Escape') {
            document.body.removeChild(modal);
            document.removeEventListener('keydown', handleEsc);
            if (onConfirm) {
                onConfirm();
            }
        }
    };
    document.addEventListener('keydown', handleEsc);
}

// 下载文件
function downloadFile(blob, fileName) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// 显示/隐藏加载状态
function showLoading(show) {
    const btnText = processBtn.querySelector('.btn-text');
    const spinner = processBtn.querySelector('.loading-spinner');
    
    if (show) {
        btnText.style.display = 'none';
        spinner.style.display = 'inline';
        processBtn.disabled = true;
    } else {
        btnText.style.display = 'inline';
        spinner.style.display = 'none';
        validateForm();
    }
}

// 显示错误信息
function showError(message) {
    document.getElementById('error_text').textContent = message;
    errorSection.style.display = 'block';
    errorSection.scrollIntoView({ behavior: 'smooth' });
}

// 隐藏错误信息
function hideError() {
    errorSection.style.display = 'none';
}

// 重置UI
function resetUI() {
    currentWorkbook = null;
    currentData = null;
    currentFileName = '';
    currentSheetName = '';
    
    const wrapper = fileInput.closest('.file-input-wrapper');
    wrapper.classList.remove('has-file');
    const label = wrapper.querySelector('.file-text');
    label.textContent = '选择Excel文件';
    
    // 重置工作表选择器
    sheetSelect.innerHTML = '<option value="">请选择工作表...</option>';
    sheetSelection.style.display = 'none';
    
    previewSection.style.display = 'none';
    resultSection.style.display = 'none';
    hideError();
    validateForm();
}

// 工具函数：清理文件名
function sanitizeFileName(name) {
    return name.toString()
        .replace(/[<>:"/\\|?*]/g, '_')
        .replace(/\s+/g, '_')
        .substring(0, 100); // 限制长度
}

// 工具函数：清理工作表名
function sanitizeSheetName(name) {
    return name.toString()
        .replace(/[\[\]\*\?\/\\]/g, '_')
        .substring(0, 31); // Excel工作表名限制31个字符
}

// 工具函数：格式化文件大小
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}