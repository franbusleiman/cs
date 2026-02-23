// WhatsApp Configuration
const WAPP_NUMBER = "5491112345678"; // Replace with real number

document.addEventListener('DOMContentLoaded', () => {
    // 1. Scroll effect for navbar
    const navbar = document.getElementById('navbar');
    
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
    });

    // 2. Intersection Observer for fade-in products
    const observerOptions = {
        root: null,
        rootMargin: '0px',
        threshold: 0.1
    };

    const observer = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    document.querySelectorAll('.product-card').forEach(card => {
        observer.observe(card);
    });

    // 3. Size selection logic
    document.querySelectorAll('.sizes').forEach(sizeContainer => {
        const sizes = sizeContainer.querySelectorAll('span');
        sizes.forEach(size => {
            size.addEventListener('click', () => {
                sizes.forEach(s => s.classList.remove('active'));
                size.classList.add('active');
            });
        });
    });

    // 4. WhatsApp links logic
    const formatWAppLink = (text) => {
        return `https://wa.me/${WAPP_NUMBER}?text=${encodeURIComponent(text)}`;
    };

    // Main floating button
    const mainWappBtn = document.getElementById('main-wapp-link');
    if (mainWappBtn) {
        mainWappBtn.href = formatWAppLink("Hola! Me gustaría hacer una consulta sobre la tienda.");
    }

    // Product specific buttons
    document.querySelectorAll('.wapp-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const productName = btn.getAttribute('data-product');
            // Get selected size
            const sizeContainer = btn.closest('.product-info').querySelector('.sizes');
            const selectedSize = sizeContainer.querySelector('.active').innerText;
            
            const message = `Hola! Estoy interesado/a en el producto: *${productName}* en talle *${selectedSize}*. ¿Me podrían dar más información?`;
            
            window.open(formatWAppLink(message), '_blank');
        });
    });
});
