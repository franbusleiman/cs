const WAPP_NUMBER = "5493513213607"; // Tu número de WhatsApp

// OPCIÓN GOOGLE SHEETS (RECOMENDADO PARA EL CLIENTE):
// 1. Crear un Google Sheet con las siguientes columnas exactas: 
//    id | name | price | description | image | sizes 
//    (los talles separados por guión, ej: S-M-L)
// 2. Ir a Archivo > Compartir > Publicar en la web. Elegir "Toda la hoja" y formato "Valores separados por comas (.csv)".
// 3. Pegar el link resultante (que termina en output=csv) acá abajo:
const GOOGLE_SHEET_CSV_URL = "";

document.addEventListener('DOMContentLoaded', async () => {
    const productsContainer = document.getElementById('products-container');
    let productsToRender = [];

    // Fallback: usar products.js si no hay link de CSV cargado
    if (typeof products !== 'undefined') {
        productsToRender = products;
    }

    if (GOOGLE_SHEET_CSV_URL.trim() !== "") {
        try {
            const response = await fetch(GOOGLE_SHEET_CSV_URL);
            const csvText = await response.text();

            // PapaParse convierte el CSV en objetos de Javascript facilísimo
            Papa.parse(csvText, {
                header: true,
                skipEmptyLines: true,
                complete: function (results) {
                    productsToRender = results.data.map(row => ({
                        id: row.id || '',
                        name: row.name || '',
                        price: row.price || '',
                        description: row.description || '',
                        image: row.image || '',
                        sizes: (row.sizes || '').split('-').map(s => s.trim()).filter(Boolean)
                    }));
                    renderProducts(productsToRender, productsContainer);
                }
            });
        } catch (error) {
            console.error("Error cargando desde Google Sheets:", error);
            renderProducts(productsToRender, productsContainer);
        }
    } else {
        renderProducts(productsToRender, productsContainer);
    }

    // 1. Efecto Scroll en Navbar
    const navbar = document.getElementById('navbar');
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
    });

    // Main floating button
    const mainWappBtn = document.getElementById('main-wapp-link');
    const formatWAppLink = (text) => `https://wa.me/${WAPP_NUMBER}?text=${encodeURIComponent(text)}`;
    if (mainWappBtn) {
        mainWappBtn.href = formatWAppLink("Hola! Me gustaría hacer una consulta sobre la tienda ALOQUEDA IMPORTADO.");
    }
});

function renderProducts(productList, container) {
    if (!container) return;
    container.innerHTML = '';
    productList.forEach(product => {
        const sizesHtml = product.sizes && product.sizes.length > 0
            ? product.sizes.map((size, index) => `<span class="${index === 1 ? 'active' : ''}">${size}</span>`).join('')
            : '';

        const productHtml = `
            <div class="product-card">
                <div class="product-image">
                    <img src="${product.image}" alt="${product.name}">
                    <div class="product-overlay">
                        <button class="btn-icon add-to-favorites"><i class="ri-heart-3-line"></i></button>
                    </div>
                </div>
                <div class="product-info">
                    <div class="product-header">
                        <h3>${product.name}</h3>
                        <span class="price">${product.price}</span>
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
    // 2. Intersection Observer (Fade in animations)
    const observer = new IntersectionObserver((entries, obs) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                obs.unobserve(entry.target);
            }
        });
    }, { threshold: 0.1 });

    document.querySelectorAll('.product-card').forEach(card => observer.observe(card));

    // 3. Lógica de selección de talles
    document.querySelectorAll('.sizes').forEach(sizeContainer => {
        const sizes = sizeContainer.querySelectorAll('span');
        sizes.forEach(size => {
            size.addEventListener('click', () => {
                sizes.forEach(s => s.classList.remove('active'));
                size.classList.add('active');
            });
        });
    });

    // 4. Lógica de botones de WhatsApp
    const formatWAppLink = (text) => `https://wa.me/${WAPP_NUMBER}?text=${encodeURIComponent(text)}`;
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
}
