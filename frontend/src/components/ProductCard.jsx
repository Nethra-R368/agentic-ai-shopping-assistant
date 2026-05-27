import React from 'react';
import { ShoppingCart, Star, Info } from 'lucide-react';

const ProductCard = ({ product }) => {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 hover:shadow-md transition-shadow duration-300 flex flex-col justify-between">
      <div>
        <div className="w-full h-40 bg-gray-50 rounded-xl mb-4 flex items-center justify-center overflow-hidden relative">
          {product.image_url ? (
            <img src={product.image_url} alt={product.name} className="object-cover w-full h-full" />
          ) : (
            <ShoppingCart className="w-12 h-12 text-gray-300" />
          )}
          {product.category && (
            <span className="absolute top-2 left-2 bg-blue-100 text-blue-800 text-xs font-semibold px-2 py-1 rounded-full">
              {product.category}
            </span>
          )}
        </div>
        <h3 className="text-lg font-bold text-gray-800 line-clamp-2 leading-tight mb-2">
          {product.name}
        </h3>
        <p className="text-gray-500 text-sm line-clamp-2 mb-4">
          {product.description}
        </p>
      </div>

      <div className="mt-auto border-t border-gray-50 pt-4">
        <div className="flex justify-between items-center mb-3">
          <span className="text-xl font-extrabold text-gray-900">
            ${product.price?.toFixed(2)}
          </span>
          <div className="flex items-center space-x-1 text-yellow-500">
            <Star className="w-4 h-4 fill-current" />
            <span className="text-sm font-semibold text-gray-700">{product.rating}</span>
          </div>
        </div>
        
        <div className="flex space-x-2">
          <button className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg font-medium text-sm transition-colors flex justify-center items-center">
            Buy Now
          </button>
          <button className="p-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors" title="Compare">
            <Info className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProductCard;
