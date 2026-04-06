Rails.application.routes.draw do
  # Health check endpoint (outside API namespace for simplicity)
  get '/health', to: 'api/v1/health#index'

  namespace :api do
    namespace :v1 do
      # Entry Points - Full CRUD
      resources :entry_points, only: %i[index create show update destroy]

      # Parking Sessions - Full CRUD with unpark action
      resources :sessions, only: %i[create show index update destroy] do
        member do
          post :unpark
        end
        collection do
          get :recent_exits
        end
      end

      # Parking Slots - Full CRUD with available action
      resources :slots, only: %i[index create show update destroy] do
        collection do
          get :available
        end
      end

      # Billing Audit Logs - Read-only
      resources :billing_audit_logs, only: %i[index show] do
        collection do
          get 'session/:session_id', to: 'billing_audit_logs#by_session'
        end
      end

      # Kafka Events - Read-only
      resources :kafka_events, only: %i[index show] do
        collection do
          get 'status/:status', to: 'kafka_events#by_status'
          get 'event-type/:type', to: 'kafka_events#by_event_type'
        end
      end

      post :initialize, to: 'initializations#create'
    end
  end
end
