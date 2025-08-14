// ==========================================
// FUNCIONALIDAD DE MODAL DE IMAGEN
// ==========================================

function openImageModal(itemId, imageUrl, nombre, precio, descripcion, vegetariano, picante, ingredientes, tiempoPreparacion) {
    const modal = document.getElementById('image-modal');
    const modalImage = document.getElementById('modal-image');
    const modalTitle = document.getElementById('modal-title');
    const modalPrice = document.getElementById('modal-price');
    const modalDescription = document.getElementById('modal-description');
    const modalBadges = document.getElementById('modal-badges');
    const modalExtraInfo = document.getElementById('modal-extra-info');
    
    // Configurar imagen
    modalImage.src = imageUrl;
    modalImage.alt = nombre;
    
    // Configurar información
    modalTitle.textContent = nombre;
    modalPrice.textContent = formatPrice(precio);
    modalDescription.textContent = descripcion || 'Deliciosa preparación de nuestra cocina';
    
    // Configurar badges
    let badgesHTML = '';
    if (vegetariano) {
        badgesHTML += '<span class="vegetarian-badge">🌱 Vegetariano</span>';
    }
    if (picante) {
        badgesHTML += '<span class="spicy-badge">🌶️ Picante</span>';
    }
    modalBadges.innerHTML = badgesHTML;
    
    // Configurar información extra
    let extraHTML = '';
    if (ingredientes && ingredientes.trim() !== '') {
        extraHTML += '<p><strong>🥘 Ingredientes:</strong> ' + ingredientes + '</p>';
    }
    if (tiempoPreparacion && tiempoPreparacion.trim() !== '') {
        extraHTML += '<p><strong>⏱️ Tiempo de preparación:</strong> ' + tiempoPreparacion + ' min</p>';
    }
    
    if (extraHTML !== '') {
        modalExtraInfo.innerHTML = '<div class="modal-extra-info">' + extraHTML + '</div>';
    } else {
        modalExtraInfo.innerHTML = '';
    }
    
    // Mostrar modal
    modal.classList.add('show');
    document.body.classList.add('modal-open');
    
    // Log para debug
    console.log('🖼️ Modal abierto para:', nombre);
    
    // Manejar error de carga de imagen
    modalImage.onerror = function() {
        this.src = getDefaultImage();
        console.log('⚠️ Error cargando imagen, usando imagen por defecto');
    };
}

function closeImageModal(event) {
    // Si se hace clic en el backdrop o en el botón cerrar
    if (!event || event.target.id === 'image-modal' || event.target.classList.contains('close-modal')) {
        const modal = document.getElementById('image-modal');
        modal.classList.remove('show');
        document.body.classList.remove('modal-open');
        
        console.log('🖼️ Modal cerrado');
    }
}

// ==========================================
// CONFIGURACIÓN DE EVENTOS DEL MODAL
// ==========================================

function setupModalEvents() {
    // Cerrar modal con tecla Escape
    document.addEventListener('keydown', function(event) {
        if (event.key === 'Escape') {
            closeImageModal();
        }
    });

    // Prevenir scroll en modal en dispositivos móviles
    const modal = document.getElementById('image-modal');
    if (modal) {
        modal.addEventListener('touchmove', function(event) {
            if (event.target === modal) {
                event.preventDefault();
            }
        }, { passive: false });
    }
}

// ==========================================
// MEJORAS DE ACCESIBILIDAD PARA IMÁGENES
// ==========================================

function setupImageAccessibility() {
    // Agregar indicadores visuales para imágenes clickeables
    const images = document.querySelectorAll('.item-image');
    images.forEach(function(img) {
        // Agregar atributos de accesibilidad
        img.setAttribute('role', 'button');
        img.setAttribute('tabindex', '0');
        img.setAttribute('aria-label', 'Clic para ver imagen en detalle');
        
        // Manejar navegación por teclado
        img.addEventListener('keydown', function(event) {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                img.click();
            }
        });
    });
}