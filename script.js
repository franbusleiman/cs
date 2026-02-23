// OPCIÓN GOOGLE SHEETS (RECOMENDADO PARA EL CLIENTE):
// 1. Crear un Google Sheet con las siguientes columnas exactas: 
//    id | name | price | description | image | image2 | sizes | category | brand | colors
//    (sizes y colors separados por guión, ej: S-M-L y Rojo-Azul)
//    (category con formato de árbol, ej: Ropa de hombre > Remeras)
// 2. Ir a Archivo > Compartir > Publicar en la web. Elegir "Toda la hoja" y formato "Valores separados por comas (.csv)".
// 3. Pegar el link resultante (que termina en output=csv) acá abajo:
const GOOGLE_SHEET_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vRE4J4z_92RsGr4wXl4V_05IJapKnYC0Gi4sGaCsVrTbYxiKceFZs9WPsgahOMBlLjtPQ4__VEudniu/pub?output=csv";

// Estado Global
let allProducts = [];
let activeFilters = {
    category: null, // String que matchea con el inicio de la categoría (ej "Ropa de hombre")
    brands: [],
    sizes: [],
    colors: []
};

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Efecto Scroll en Navbar
    const navbar = document.getElementById('navbar');
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
    });

    // 2. Botón flotante de WhatsApp principal
    const WAPP_NUMBER = "5493513213607";
    const mainWappBtn = document.getElementById('main-wapp-link');
    const formatWAppLink = (text) => `https://wa.me/${WAPP_NUMBER}?text=${encodeURIComponent(text)}`;
    if (mainWappBtn) {
        mainWappBtn.href = formatWAppLink("Hola! Me gustaría hacer una consulta. Busco una prenda específica para cotizar con ALOQUEDA ROPA IMPORTADA.");
    }

    // 3. Lógica del menú de filtros en Móvil
    const mobileFilterBtn = document.getElementById('mobile-filter-btn');
    const sidebar = document.getElementById('shop-sidebar');
    const closeFiltersBtn = document.getElementById('close-filters');

    if (mobileFilterBtn && sidebar) {
        mobileFilterBtn.addEventListener('click', () => {
            sidebar.classList.add('active');
            document.body.style.overflow = 'hidden'; // Prevenir scroll trasero
        });
    }
    if (closeFiltersBtn && sidebar) {
        closeFiltersBtn.addEventListener('click', () => {
            sidebar.classList.remove('active');
            document.body.style.overflow = '';
        });
    }

    // 4. Carga de productos
    if (typeof products !== 'undefined' && GOOGLE_SHEET_CSV_URL.trim() === "") {
        // Fallback a products.js si no hay CSV
        allProducts = normalizeProducts(products);
        initStore();
    } else if (GOOGLE_SHEET_CSV_URL.trim() !== "") {
        try {
            const timestamp = new Date().getTime();
            const noCacheUrl = GOOGLE_SHEET_CSV_URL + (GOOGLE_SHEET_CSV_URL.includes('?') ? '&' : '?') + 't=' + timestamp;
            const response = await fetch(noCacheUrl, { cache: "no-store" });
            const csvText = await response.text();

            Papa.parse(csvText, {
                header: true,
                skipEmptyLines: true,
                complete: function (results) {
                    allProducts = normalizeProducts(results.data);
                    initStore();
                }
            });
        } catch (error) {
            console.error("Error cargando desde Google Sheets:", error);
            if (typeof products !== 'undefined') {
                allProducts = normalizeProducts(products);
                initStore();
            }
        }
    }
});

// Función para convertir links de Google Drive a links directos de imagen
const parseDriveLink = (url) => {
    if (!url) return '';
    const driveRegex = /(?:drive\.google\.com\/(?:file\/d\/|open\?id=)|docs\.google\.com\/uc\?id=)([a-zA-Z0-9_-]+)/;
    const match = url.match(driveRegex);
    if (match && match[1]) {
        return `https://drive.google.com/thumbnail?id=${match[1]}&sz=w1000`;
    }
    return url;
};

// Normalizar datos vengan de donde vengan
function normalizeProducts(rawList) {
    return rawList.map(row => ({
        id: row.id || '',
        name: row.name || '',
        price: row.price || '',
        description: row.description || '',
        image1: parseDriveLink(row.image || row.image1 || ''),
        image2: parseDriveLink(row.image2 || ''),
        sizes: (row.sizes || '').split('-').map(s => s.trim()).filter(Boolean),
        category: (row.category || '').trim(),
        brand: (row.brand || '').trim(),
        colors: (row.colors || '').split('-').map(c => c.trim().toLowerCase()).filter(Boolean)
    }));
}

const COLOR_MAP = {
    'rojo': '#e74c3c', 'azul': '#3498db', 'verde': '#2ecc71',
    'negro': '#222222', 'blanco': '#ffffff', 'gris': '#95a5a6',
    'amarillo': '#f1c40f', 'rosa': '#e84393', 'naranja': '#e67e22',
    'beige': '#f5f5dc', 'marrón': '#8b4513', 'celeste': '#87ceeb',
    'violeta': '#9b59b6', 'fucsia': '#ff00ff', 'crema': '#fffdd0'
};

function initStore() {
    applyFiltersAndRender();
}

function buildFilterUI(filteredProducts) {
    // 1. Extraer datos únicos SOLAMENTE de los productos que están pasando el filtro de CATEGORÍA
    // Nota: Para Marcas/Talles/Colores usamos el productList actual de la vista
    const brandsSet = new Set();
    const sizesSet = new Set();
    const colorsSet = new Set();

    filteredProducts.forEach(p => {
        if (p.brand) brandsSet.add(p.brand);
        p.sizes.forEach(s => sizesSet.add(s));
        p.colors.forEach(c => colorsSet.add(c));
    });

    renderBrandFilters(brandsSet);
    renderSizeFilters(sizesSet);
    renderColorFilters(colorsSet);
}

function renderCategoryTree() {
    const categoryContainer = document.getElementById('category-filters');
    if (!categoryContainer) return;

    const categoriesSet = new Set();
    allProducts.forEach(p => { if (p.category) categoriesSet.add(p.category); });

    // Construir objeto de árbol
    const tree = {};
    categoriesSet.forEach(path => {
        const parts = path.split('>').map(p => p.trim());
        let currentLevel = tree;
        parts.forEach(part => {
            if (!currentLevel[part]) {
                currentLevel[part] = { _path: '', _children: {} };
            }
            currentLevel = currentLevel[part]._children;
        });
    });

    // Función recursiva para setear los paths completos
    function setPaths(node, parentPath = '') {
        Object.keys(node).forEach(key => {
            const fullPath = parentPath ? `${parentPath} > ${key}` : key;
            node[key]._path = fullPath;
            setPaths(node[key]._children, fullPath);
        });
    }
    setPaths(tree);

    function generateHtml(node, level = 0) {
        let html = '';
        Object.keys(node).sort().forEach(key => {
            const item = node[key];
            const isSelected = activeFilters.category === item._path;
            const isParentOfSelected = activeFilters.category && activeFilters.category.startsWith(item._path + ' >');
            const hasChildren = Object.keys(item._children).length > 0;

            html += `
                <div class="radio-label" style="margin-left: ${level * 20}px">
                    <input type="radio" name="category" value="${item._path}" ${isSelected ? 'checked' : ''}>
                    <span style="font-weight: ${isSelected || isParentOfSelected ? '600' : '400'}">${key}</span>
                </div>
            `;

            // Mostrar hijos solo si esta ruta es padre de la seleccionada o es la seleccionada
            if (isSelected || isParentOfSelected) {
                html += generateHtml(item._children, level + 1);
            }
        });
        return html;
    }

    let rootHtml = `
        <div class="radio-label">
            <input type="radio" name="category" value="" ${!activeFilters.category ? 'checked' : ''}>
            <span>Todas</span>
        </div>
    `;
    rootHtml += generateHtml(tree);
    categoryContainer.innerHTML = rootHtml;

    categoryContainer.querySelectorAll('input').forEach(input => {
        input.addEventListener('change', (e) => {
            activeFilters.category = e.target.value || null;
            // Al cambiar de categoría, reseteamos los otros filtros para evitar estados imposibles
            activeFilters.brands = [];
            activeFilters.sizes = [];
            activeFilters.colors = [];
            applyFiltersAndRender();
        });
    });
}

function renderBrandFilters(brandsSet) {
    const brandContainer = document.getElementById('brand-filters');
    if (!brandContainer) return;

    if (brandsSet.size === 0) {
        brandContainer.parentElement.style.display = 'none';
        return;
    }
    brandContainer.parentElement.style.display = 'block';

    let html = '';
    [...brandsSet].sort().forEach(brand => {
        const isChecked = activeFilters.brands.includes(brand);
        html += `
            <label class="checkbox-label">
                <input type="checkbox" value="${brand}" class="filter-brand" ${isChecked ? 'checked' : ''}>
                <span>${brand}</span>
            </label>
        `;
    });
    brandContainer.innerHTML = html;

    brandContainer.querySelectorAll('input').forEach(input => {
        input.addEventListener('change', () => {
            activeFilters.brands = Array.from(brandContainer.querySelectorAll('input:checked')).map(cb => cb.value);
            applyFiltersAndRender(false); // false para no reconstruir marcas/talles/colores mientras seleccionamos
        });
    });
}

function renderSizeFilters(sizesSet) {
    const sizeContainer = document.getElementById('size-filters');
    if (!sizeContainer) return;

    if (sizesSet.size === 0) {
        sizeContainer.parentElement.style.display = 'none';
        return;
    }
    sizeContainer.parentElement.style.display = 'block';

    const sizeOrder = { 'XS': 1, 'S': 2, 'M': 3, 'L': 4, 'XL': 5, 'XXL': 6 };
    const sortedSizes = [...sizesSet].sort((a, b) => (sizeOrder[a] || 99) - (sizeOrder[b] || 99));

    let html = '';
    sortedSizes.forEach(size => {
        const isActive = activeFilters.sizes.includes(size);
        html += `<span class="size-filter-btn ${isActive ? 'active' : ''}" data-value="${size}">${size}</span>`;
    });
    sizeContainer.innerHTML = html;

    sizeContainer.querySelectorAll('.size-filter-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.target.classList.toggle('active');
            activeFilters.sizes = Array.from(sizeContainer.querySelectorAll('.active')).map(b => b.dataset.value);
            applyFiltersAndRender(false);
        });
    });
}

function renderColorFilters(colorsSet) {
    const colorContainer = document.getElementById('color-filters');
    if (!colorContainer) return;

    if (colorsSet.size === 0) {
        colorContainer.parentElement.style.display = 'none';
        return;
    }
    colorContainer.parentElement.style.display = 'block';

    let html = '';
    [...colorsSet].sort().forEach(color => {
        const hex = COLOR_MAP[color] || color;
        const isActive = activeFilters.colors.includes(color);
        const borderStyle = (color === 'blanco' || hex === '#ffffff') ? 'border: 1px solid #ccc;' : '';
        html += `<span class="color-filter-btn ${isActive ? 'active' : ''}" data-value="${color}" style="background-color: ${hex}; ${borderStyle}" title="${color}"></span>`;
    });
    colorContainer.innerHTML = html;

    colorContainer.querySelectorAll('.color-filter-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.target.classList.toggle('active');
            activeFilters.colors = Array.from(colorContainer.querySelectorAll('.active')).map(b => b.dataset.value);
            applyFiltersAndRender(false);
        });
    });
}

function applyFiltersAndRender(rebuildUI = true) {
    // 1. Filtrar primero por categoría para saber qué opciones de Marca/Talle/Color mostrar
    const categoryFiltered = allProducts.filter(p => {
        if (activeFilters.category && !p.category.startsWith(activeFilters.category)) return false;
        return true;
    });

    if (rebuildUI) {
        renderCategoryTree();
        buildFilterUI(categoryFiltered);
    }

    // 2. Aplicar el resto de los filtros sobre los ya filtrados por categoría
    const fullyFiltered = categoryFiltered.filter(p => {
        if (activeFilters.brands.length > 0 && !activeFilters.brands.includes(p.brand)) return false;
        if (activeFilters.sizes.length > 0 && !activeFilters.sizes.some(s => p.sizes.includes(s))) return false;
        if (activeFilters.colors.length > 0 && !activeFilters.colors.some(c => p.colors.includes(c))) return false;
        return true;
    });

    renderProducts(fullyFiltered);
}

function renderProducts(productList) {
    const container = document.getElementById('products-container');
    if (!container) return;
    container.innerHTML = '';

    if (productList.length === 0) {
        container.innerHTML = `
            <div class="empty-state" style="grid-column: 1 / -1; text-align: center; padding: 60px 20px;">
                <i class="ri-search-eye-line" style="font-size: 3rem; color: #ccc;"></i>
                <h3 style="margin-top: 16px;">No se encontraron productos</h3>
                <p style="color: #666;">Intentá quitar algunos filtros para ver más resultados.</p>
            </div>
        `;
        return;
    }

    // Preparar grilla real
    container.classList.add('products-grid');

    productList.forEach(product => {
        const sizesHtml = product.sizes && product.sizes.length > 0
            ? product.sizes.map((size, index) => `<span class="${index === 1 ? 'active' : ''}">${size}</span>`).join('')
            : '';

        const hasTwoImages = product.image1 && product.image2;
        let imagesHtml = '';
        if (product.image1) imagesHtml += `<img src="${product.image1}" alt="${product.name}" class="carousel-img active">`;
        if (product.image2) imagesHtml += `<img src="${product.image2}" alt="${product.name} vista 2" class="carousel-img">`;

        let carouselControls = '';
        if (hasTwoImages) {
            carouselControls = `
                <button class="carousel-btn prev"><i class="ri-arrow-left-s-line"></i></button>
                <button class="carousel-btn next"><i class="ri-arrow-right-s-line"></i></button>
                <div class="carousel-dots">
                    <span class="dot active"></span>
                    <span class="dot"></span>
                </div>
            `;
        }

        const productHtml = `
            <div class="product-card visible">
                <div class="product-image">
                    ${imagesHtml}
                    ${carouselControls}
                    <div class="product-overlay">
                        <button class="btn-icon add-to-favorites"><i class="ri-heart-3-line"></i></button>
                    </div>
                </div>
                <div class="product-info">
                    <div class="product-header">
                        <h3>${product.name}</h3>
                        <span class="price">${product.price} USD</span>
                    </div>
                    <p class="description">${product.description}</p>
                    <div class="sizes">
                        ${sizesHtml}
                    </div>
                    <button class="btn btn-outline wapp-btn" data-product="${product.name}">
                        <i class="ri-whatsapp-line"></i> Consultar
                    </button>
                </div>
            </div>
        `;
        container.insertAdjacentHTML('beforeend', productHtml);
    });

    attachDynamicListeners();
}

function attachDynamicListeners() {
    const WAPP_NUMBER = "5493513213607";
    const formatWAppLink = (text) => `https://wa.me/${WAPP_NUMBER}?text=${encodeURIComponent(text)}`;

    // 1. Selector de talles en producto
    document.querySelectorAll('.product-card .sizes').forEach(sizeContainer => {
        const sizes = sizeContainer.querySelectorAll('span');
        sizes.forEach(size => {
            size.addEventListener('click', (e) => {
                sizes.forEach(s => s.classList.remove('active'));
                e.target.classList.add('active');
            });
        });
    });

    // 2. WhatsApp Botones
    document.querySelectorAll('.wapp-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const productName = btn.getAttribute('data-product');
            const sizeContainer = btn.closest('.product-info').querySelector('.sizes');
            const activeSizeSpan = sizeContainer ? sizeContainer.querySelector('.active') : null;
            const selectedSize = activeSizeSpan ? activeSizeSpan.innerText : '';

            const message = selectedSize
                ? `Hola! Estoy interesado/a en el producto: *${productName}* en talle *${selectedSize}*. ¿Me podrían dar más información?`
                : `Hola! Estoy interesado/a en el producto: *${productName}*. ¿Me podrían dar más información?`;

            window.open(formatWAppLink(message), '_blank');
        });
    });

    // 3. Lógica de los carruseles de imágenes
    document.querySelectorAll('.product-image').forEach(container => {
        const imgs = container.querySelectorAll('.carousel-img');
        if (imgs.length <= 1) return;

        const prevBtn = container.querySelector('.prev');
        const nextBtn = container.querySelector('.next');
        const dots = container.querySelectorAll('.dot');
        let currentIndex = 0;

        const showImage = (index) => {
            imgs.forEach(img => img.classList.remove('active'));
            dots.forEach(dot => dot.classList.remove('active'));
            imgs[index].classList.add('active');
            dots[index].classList.add('active');
        };

        if (nextBtn) {
            nextBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                currentIndex = (currentIndex + 1) % imgs.length;
                showImage(currentIndex);
            });
        }

        if (prevBtn) {
            prevBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                currentIndex = (currentIndex - 1 + imgs.length) % imgs.length;
                showImage(currentIndex);
            });
        }
    });
}
