Rails.application.routes.draw do
  # Health check endpoint (outside API namespace for simplicity)
  get '/health', to: 'api/v1/health#index'

  namespace :api do
    namespace :v1 do
      resources :entry_points, only: %i[index create update destroy]
      resources :sessions, only: %i[create show index destroy] do
        member do
          post :unpark
        end
      end
      resources :slots, only: %i[index create update destroy] do
        collection do
          get :available
        end
      end
      post :initialize, to: 'initializations#create'
    end
  end
end
