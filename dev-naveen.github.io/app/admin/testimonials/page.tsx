// Testimonials feature has been removed from the admin.
export default function TestimonialsPagePlaceholder() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Testimonials (Removed)</h1>
      <p className="mt-2 text-gray-600 dark:text-gray-400">The testimonials feature has been removed from this site.</p>
    </div>
  );
}
          testimonial={editingTestimonial || undefined}
          onSubmit={handleSubmitTestimonial}
          onCancel={handleCloseForm}
          isLoading={isSubmitting}
        />
      )}

      {/* Toast Notification */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-2 rounded-md shadow-lg ${
          toast.type === 'success' 
            ? 'bg-green-500 text-white' 
            : 'bg-red-500 text-white'
        }`}>
          {toast.message}
        </div>
      )}
    </div>
  );
}